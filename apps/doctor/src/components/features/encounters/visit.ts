import type { Diagnosis, PrescriptionItem, SOAP, Vitals } from "@/types";
import { completeVisit } from "@/lib/api/encounters";
import { VITALS_MAP } from "@/lib/api/clinical";
import { updateAppointment } from "@/lib/api/appointments";
import { changedVitalKeys } from "@/lib/utils";

export type LabPriority = "routine" | "urgent" | "stat";

export interface LabTestDraft {
  code: string;
  name: string;
  /** The lab the test is sent to. Drafts saved before tests went to a lab have none. */
  labId?: string;
}

export interface VisitDraft {
  /** The encounter id, fixed when the draft starts, so signing again after a failure can't record the visit twice. */
  id: string;
  chiefComplaint: string;
  soap: SOAP;
  vitals: Partial<Vitals>;
  diagnoses: Diagnosis[];
  prescriptions: PrescriptionItem[];
  labTests: LabTestDraft[];
  labPriority: LabPriority;
  labNotes: string;
}

export const emptyVisit = (): VisitDraft => ({
  id: crypto.randomUUID(),
  chiefComplaint: "",
  soap: { subjective: "", objective: "", assessment: "", plan: "" },
  vitals: {},
  diagnoses: [],
  prescriptions: [],
  labTests: [],
  labPriority: "routine",
  labNotes: "",
});

interface SignContext {
  patientId: string;
  appointmentId?: string;
  triageVitals?: Partial<Vitals>;
}

/**
 * Saves the whole visit in one request, which the backend records all or nothing. Signing
 * again after a failure is safe: the backend returns the visit if it already has it.
 * Returns the encounter id and whether the linked appointment was closed.
 */
export async function signVisit(visit: VisitDraft, ctx: SignContext): Promise<{ encounterId: string; appointmentClosed: boolean }> {
  const { patientId, appointmentId } = ctx;
  const { subjective, objective, assessment, plan } = visit.soap;
  // Only values the doctor added or changed — triage vitals are already linked to the encounter.
  const changedVitals = changedVitalKeys(visit.vitals, ctx.triageVitals);

  const encounter = await completeVisit({
    id: visit.id,
    patientId,
    appointmentId,
    reasonCode: visit.chiefComplaint,
    note: {
      subjective: subjective || undefined,
      objective: objective || undefined,
      assessment: assessment || undefined,
      plan: plan || undefined,
      additionalNotes: visit.chiefComplaint,
    },
    vitals: VITALS_MAP.filter(v => changedVitals.includes(v.key)).map(v => ({
      code: v.code,
      display: v.display,
      valueQuantity: visit.vitals[v.key] as number,
      valueUnit: v.unit,
    })),
    diagnoses: visit.diagnoses.map(d => ({ code: d.icdCode, display: d.name, isPrimary: d.isPrimary })),
    prescriptions: visit.prescriptions.map(rx => ({
      medicationCode: rx.medicationId,
      medicationDisplay: rx.displayName,
      dosageText: rx.dose,
      route: rx.route,
      frequency: rx.frequency,
      durationDays: rx.durationDays,
      quantityValue: rx.quantity,
      note: rx.instructions || undefined,
    })),
    labOrders: visit.labTests.map(test => ({
      performerOrganizationId: test.labId,
      code: test.code,
      display: test.name,
      priority: visit.labPriority,
      note: visit.labNotes || undefined,
    })),
  });

  // Closing the appointment moves the patient's queue stage to done. The visit itself is already
  // signed at this point, so a failure here is reported but doesn't undo the sign.
  let appointmentClosed = true;
  if (appointmentId) {
    appointmentClosed = await updateAppointment(appointmentId, { status: "fulfilled" }).then(() => true, () => false);
  }

  return { encounterId: encounter.id, appointmentClosed };
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
