import type { Diagnosis, PrescriptionItem, SOAP, Vitals } from "@/types";
import { createEncounter, updateEncounterStatus } from "@/lib/api/encounters";
import { createLabOrder, createNote, createPrescription, createVitals, VITALS_MAP } from "@/lib/api/clinical";
import { createCondition } from "@/lib/api/patients";
import { updateAppointment } from "@/lib/api/appointments";
import { ENCOUNTER_DIAGNOSIS, PRIMARY_DIAGNOSIS_NOTE } from "@/lib/api/mappers";
import { changedVitalKeys } from "@/lib/utils";

export type LabPriority = "routine" | "urgent" | "stat";

export interface LabTestDraft {
  code: string;
  name: string;
}

// Which sign steps already reached the server — lets a failed sign be retried without
// creating a second encounter or duplicate orders.
export interface SignProgress {
  encounterId?: string;
  note?: boolean;
  vitals?: boolean;
  diagnoses: string[]; // ICD codes posted
  prescriptions: string[]; // item ids posted
  labs: string[]; // test codes posted
  completed?: boolean;
}

export interface VisitDraft {
  chiefComplaint: string;
  soap: SOAP;
  vitals: Partial<Vitals>;
  diagnoses: Diagnosis[];
  prescriptions: PrescriptionItem[];
  labTests: LabTestDraft[];
  labPriority: LabPriority;
  labNotes: string;
  progress: SignProgress;
}

export const emptyVisit = (): VisitDraft => ({
  chiefComplaint: "",
  soap: { subjective: "", objective: "", assessment: "", plan: "" },
  vitals: {},
  diagnoses: [],
  prescriptions: [],
  labTests: [],
  labPriority: "routine",
  labNotes: "",
  progress: { diagnoses: [], prescriptions: [], labs: [] },
});

interface SignContext {
  patientId: string;
  appointmentId?: string;
  triageVitals?: Partial<Vitals>;
  /** Called after every step so progress survives a reload. */
  onProgress: (progress: SignProgress) => void;
}

/**
 * Writes the visit to the backend step by step. Every step is skipped when `progress`
 * says it already happened, so calling this again after a failure resumes where it stopped.
 * Returns the encounter id and whether the linked appointment was closed.
 */
export async function signVisit(visit: VisitDraft, ctx: SignContext): Promise<{ encounterId: string; appointmentClosed: boolean }> {
  const progress: SignProgress = { ...visit.progress };
  const save = () => ctx.onProgress({ ...progress });
  const { patientId, appointmentId } = ctx;

  if (!progress.encounterId) {
    const encounter = await createEncounter({
      patientId,
      appointmentId,
      reasonCode: visit.chiefComplaint,
      periodStart: new Date().toISOString(),
    });
    progress.encounterId = encounter.id;
    save();
  }
  const encounterId = progress.encounterId;

  if (!progress.note) {
    const { subjective, objective, assessment, plan } = visit.soap;
    await createNote({
      patientId, encounterId,
      subjective: subjective || undefined,
      objective: objective || undefined,
      assessment: assessment || undefined,
      plan: plan || undefined,
      additionalNotes: visit.chiefComplaint,
    });
    progress.note = true;
    save();
  }

  if (!progress.vitals) {
    // Only values the doctor added or changed — triage vitals are already linked to the encounter.
    const changed = changedVitalKeys(visit.vitals, ctx.triageVitals);
    await Promise.all(VITALS_MAP.filter(v => changed.includes(v.key)).map(v => createVitals({
      patientId, encounterId,
      code: v.code,
      display: v.display,
      valueQuantity: visit.vitals[v.key] as number,
      valueUnit: v.unit,
      effectiveDateTime: new Date().toISOString(),
    })));
    progress.vitals = true;
    save();
  }

  // Sequential so the primary diagnosis is recorded first.
  const diagnoses = [...visit.diagnoses].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  for (const d of diagnoses) {
    if (progress.diagnoses.includes(d.icdCode)) continue;
    await createCondition(patientId, {
      clinicalStatus: "active",
      code: d.icdCode,
      display: d.name,
      category: ENCOUNTER_DIAGNOSIS,
      encounterId,
      onsetDate: new Date().toISOString().slice(0, 10),
      note: d.isPrimary ? PRIMARY_DIAGNOSIS_NOTE : undefined,
    });
    progress.diagnoses = [...progress.diagnoses, d.icdCode];
    save();
  }

  for (const rx of visit.prescriptions) {
    if (progress.prescriptions.includes(rx.id)) continue;
    await createPrescription({
      patientId, encounterId,
      medicationCode: rx.medicationId,
      medicationDisplay: rx.displayName,
      dosageText: rx.dose,
      route: rx.route,
      frequency: rx.frequency,
      durationDays: rx.durationDays,
      quantityValue: rx.quantity,
      note: rx.instructions || undefined,
    });
    progress.prescriptions = [...progress.prescriptions, rx.id];
    save();
  }

  for (const test of visit.labTests) {
    if (progress.labs.includes(test.code)) continue;
    await createLabOrder({
      patientId, encounterId,
      code: test.code,
      display: test.name,
      priority: visit.labPriority,
      note: visit.labNotes || undefined,
    });
    progress.labs = [...progress.labs, test.code];
    save();
  }

  if (!progress.completed) {
    await updateEncounterStatus(encounterId, "completed");
    progress.completed = true;
    save();
  }

  // Closing the appointment moves the patient's queue stage to done. The visit itself is already
  // signed at this point, so a failure here is reported but doesn't undo the sign.
  let appointmentClosed = true;
  if (appointmentId) {
    appointmentClosed = await updateAppointment(appointmentId, { status: "fulfilled" }).then(() => true, () => false);
  }

  return { encounterId, appointmentClosed };
}

// ─── Prescribing helpers ─────────────────────────────────────────────────────

export const FREQUENCIES = [
  { value: "OD", label: "Once daily (OD)", perDay: 1 },
  { value: "BD", label: "Twice daily (BD)", perDay: 2 },
  { value: "TDS", label: "Three times daily (TDS)", perDay: 3 },
  { value: "QDS", label: "Four times daily (QDS)", perDay: 4 },
  { value: "Nocte", label: "At night (Nocte)", perDay: 1 },
  { value: "PRN", label: "As needed (PRN)", perDay: 0 },
  { value: "STAT", label: "Single dose (STAT)", perDay: 0 },
] as const;

/** Suggested dispense quantity for a frequency and duration (null when it can't be derived). */
export function suggestQuantity(frequency: string, days: number): number | null {
  if (frequency === "STAT") return 1;
  const perDay = FREQUENCIES.find(f => f.value === frequency)?.perDay ?? 0;
  return perDay > 0 && days > 0 ? perDay * days : null;
}

export function routeForForm(form?: string): string {
  const f = (form ?? "").toLowerCase();
  if (f.includes("inhal")) return "inhalation";
  if (f.includes("cream") || f.includes("ointment") || f.includes("gel")) return "topical";
  if (f.includes("inject")) return "injection";
  if (f.includes("drop")) return "ophthalmic";
  return "oral";
}
