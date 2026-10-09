"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Activity, ArrowLeft, Baby, Droplets, HeartPulse, Info, Loader2, Ruler, Thermometer, UserX, Wind } from "lucide-react";
import type { Allergy, Appointment, Patient, Problem, QueueStage, Vitals } from "@/types";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import Link from "next/link";
import { Button } from "@curo/web/ui/button";
import { getAppointmentById, updateQueueStage } from "@/lib/api/appointments";
import { getAllergies, getConditions, getPatientById } from "@/lib/api/patients";
import { getPractitioners, type Practitioner } from "@/lib/api/practitioners";
import { getLatestVitals, getVisitVitals, recordVitals } from "@/lib/api/vitals";
import { apiErrorMessage } from "@curo/web/api";
import { ROUTES } from "@/lib/constants";
import { TRIAGE_STAGES } from "@/lib/queue";
import {
  VITAL_FIELD, ADULT_FROM_AGE, adultRangesApply, assessBMI, calculateBMI, changedVitalKeys, parseDraft, toDraft, type VitalsDraft,
} from "@/lib/vitals";
import { PatientBanner } from "./PatientBanner";
import { VitalTile } from "./VitalTile";
import { TriageSummary } from "./TriageSummary";

interface TriageContext {
  appointment: Appointment;
  patient: Patient;
  doctor?: Practitioner;
  allergies: Allergy[] | null;
  conditions: Problem[] | null;
  previous: Partial<Vitals> | null;   // latest reading of each vital, any visit; null if it couldn't be loaded
  recorded: Partial<Vitals>;   // already recorded for this visit (re-opened triage)
}

async function loadTriage(appointmentId: string): Promise<TriageContext> {
  let appointment = await getAppointmentById(appointmentId);
  const patientId = appointment.patientId;
  const [patient, allergies, conditions, previous, recorded, doctors] = await Promise.all([
    getPatientById(patientId),
    getAllergies(patientId).catch(() => null),
    getConditions(patientId).catch(() => null),
    getLatestVitals(patientId).catch(() => null),
    getVisitVitals(appointmentId),
    getPractitioners("DOCTOR").catch(() => []),
  ]);
  // Opened straight from a link rather than "Start triage": claim the patient.
  if (appointment.queueStage === "waiting_nurse") {
    appointment = await updateQueueStage(appointmentId, "with_nurse");
  }
  return {
    appointment, patient, allergies, conditions, previous, recorded,
    doctor: doctors.find(d => d.id === appointment.doctorId),
  };
}

export function TriageWorkspace({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [context, setContext] = useState<TriageContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<VitalsDraft>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    loadTriage(appointmentId)
      .then(ctx => {
        if (!active) return;
        setContext(ctx);
        setDraft(toDraft(ctx.recorded));
      })
      .catch(err => active && setLoadError(apiErrorMessage(err, "This visit could not be loaded.")));
    return () => { active = false; };
  }, [appointmentId]);

  const { values, invalid } = useMemo(() => parseDraft(draft), [draft]);

  if (loadError) {
    return (
      <Card className="max-w-6xl mx-auto shadow-sm border">
        <EmptyState icon={UserX} title="Triage unavailable" description={loadError} action={<Button asChild variant="outline" size="sm"><Link href={ROUTES.TRIAGE_QUEUE}>Back to triage queue</Link></Button>} />
      </Card>
    );
  }
  if (!context) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { appointment, patient, doctor, recorded } = context;
  const doctorName = doctor ? `Dr. ${doctor.name.full}` : "the doctor";
  const readOnly = !TRIAGE_STAGES.includes(appointment.queueStage as QueueStage);
  const hasRecorded = Object.keys(recorded).length > 0;
  const changed = changedVitalKeys(values, recorded);
  const canSave = invalid.length === 0 && (changed.length > 0 || hasRecorded);
  const bmi = calculateBMI(values.heightCm, values.weightKg);
  // Adult ranges would mislabel a child's normal readings, so children's aren't flagged.
  const flagRanges = adultRangesApply(patient.dob);

  const setField = (key: keyof Vitals, raw: string) => setDraft(d => ({ ...d, [key]: raw }));
  const backToQueue = () => router.push(ROUTES.TRIAGE_QUEUE);

  const handleSave = async () => {
    setSaving(true);
    try {
      await recordVitals(patient.id, appointment.id, values, changed);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Vitals were not saved. Check the readings and try again."));
      setSaving(false);
      return;
    }
    try {
      await updateQueueStage(appointment.id, "ready_for_doctor");
      toast.success(`Vitals sent to ${doctorName} for ${patient.name.first}`);
    } catch {
      // Vitals are stored against the visit either way; the doctor simply got there first.
      toast.warning(`Vitals saved — ${doctorName} has already started the visit and will see them.`);
    }
    backToQueue();
  };

  // Put the patient back where they were: still waiting, or (re-opened triage) still with the doctor's queue.
  const handleReturn = async () => {
    if (!readOnly) {
      const stage: QueueStage = hasRecorded ? "ready_for_doctor" : "waiting_nurse";
      try {
        await updateQueueStage(appointment.id, stage);
      } catch (err) {
        toast.error(apiErrorMessage(err, `${patient.name.first} couldn't be returned to the queue. Try again.`));
        return;
      }
    }
    backToQueue();
  };

  const tileProps = { draft, values, invalid, previous: context.previous ?? {}, disabled: readOnly || saving, flagRanges, onChange: setField };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {/* Only navigates: "Return to queue" below also puts the patient back in the waiting room. */}
      <Link href={ROUTES.TRIAGE_QUEUE} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Triage queue
      </Link>

      <PatientBanner
        patient={patient}
        appointment={appointment}
        doctor={doctor}
        allergies={context.allergies}
        conditions={context.conditions}
      />

      {context.previous === null && (
        <p className="flex items-center gap-2 rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-text">
          <Info className="h-4 w-4 shrink-0" />
          Earlier readings couldn&apos;t be loaded, so none are shown for comparison.
        </p>
      )}

      {!flagRanges && (
        <p className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Baby className="h-4 w-4 shrink-0" />
          {patient.dob
            ? `Readings aren't flagged for patients under ${ADULT_FROM_AGE}: the adult ranges don't apply to children.`
            : "Readings aren't flagged: without a date of birth, the adult ranges can't be checked."}
        </p>
      )}

      {readOnly && (
        <p className="flex items-center gap-2 rounded-lg border border-status-info-border bg-status-info-bg px-4 py-3 text-sm text-status-info-text">
          <Info className="h-4 w-4 shrink-0" />
          {doctorName} has started this visit, so vitals can no longer be changed from triage.
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4 sm:grid-cols-2">
          <VitalTile
            title="Blood pressure" icon={Activity} separator="/" className="sm:col-span-2"
            fields={[VITAL_FIELD.bpSystolic, VITAL_FIELD.bpDiastolic]} {...tileProps}
          />
          <VitalTile title="Pulse" icon={HeartPulse} fields={[VITAL_FIELD.pulseBpm]} {...tileProps} />
          <VitalTile title="Oxygen saturation" icon={Droplets} fields={[VITAL_FIELD.spo2Percent]} {...tileProps} />
          <VitalTile title="Temperature" icon={Thermometer} fields={[VITAL_FIELD.temperatureC]} {...tileProps} />
          <VitalTile title="Respiration" icon={Wind} fields={[VITAL_FIELD.respirationRpm]} {...tileProps} />
          <VitalTile
            title="Height & weight" icon={Ruler} className="sm:col-span-2"
            fields={[VITAL_FIELD.heightCm, VITAL_FIELD.weightKg]}
            assessment={bmi ? assessBMI(bmi) : null}
            {...tileProps}
          >
            <p className="mt-3 text-sm text-muted-foreground">
              BMI{" "}
              <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{bmi ?? "—"}</span>
              {!bmi && <span className="ml-2 text-xs">calculated from height and weight</span>}
            </p>
          </VitalTile>
        </div>

        <TriageSummary
          values={values}
          doctorName={doctorName}
          saving={saving}
          readOnly={readOnly}
          flagRanges={flagRanges}
          canSave={canSave}
          returnLabel={readOnly ? "Back to triage queue" : changed.length > 0 ? "Discard changes and return" : "Return to queue"}
          onSave={handleSave}
          onReturn={handleReturn}
        />
      </div>
    </div>
  );
}
