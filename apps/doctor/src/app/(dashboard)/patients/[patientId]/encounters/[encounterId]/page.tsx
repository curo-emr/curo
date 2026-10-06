"use client";

import { useState, useEffect, use } from "react";
import { FileX, FlaskConical, HeartPulse, NotebookPen, Pill, Printer, Star, Stethoscope, UserCheck } from "lucide-react";
import type { Encounter, LabOrder, Patient, Prescription, Problem } from "@/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RxPrint, rxDirections } from "@/components/features/prescriptions/RxPrint";
import { useAuth } from "@/contexts/AuthContext";
import { getEncounterById } from "@/lib/api/encounters";
import { getConditions, getPatientById } from "@/lib/api/patients";
import { getEncounterSoap, getEncounterVitals, getLabOrdersByPatient, getPrescriptionsByPatient } from "@/lib/api/clinical";
import { ROUTES } from "@/lib/constants";
import { encounterDiagnoses } from "@/lib/clinical";
import { calculateBMI, formatDate } from "@/lib/utils";

interface Summary {
  encounter: Encounter | null;
  patient: Patient | null;
  prescriptions: Prescription[];
  labOrders: LabOrder[];
  diagnoses: Problem[];
  triagedByNurse: boolean;
}

const SOAP_LABELS = [
  { key: "subjective", label: "Subjective" },
  { key: "objective", label: "Objective" },
  { key: "assessment", label: "Assessment" },
  { key: "plan", label: "Plan" },
] as const;

export default function VisitSummaryPage({ params }: { params: Promise<{ patientId: string; encounterId: string }> }) {
  const { patientId, encounterId } = use(params);
  const { user } = useAuth();
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    Promise.all([
      getEncounterById(encounterId),
      getPatientById(patientId),
      getPrescriptionsByPatient(patientId).catch(() => [] as Prescription[]),
      getLabOrdersByPatient(patientId).catch(() => [] as LabOrder[]),
      getConditions(patientId).catch(() => [] as Problem[]),
      // SOAP and vitals are stored separately from the encounter, so backfill them here.
      getEncounterSoap(encounterId).catch(() => null),
      getEncounterVitals(patientId, encounterId).catch(() => ({ vitals: {}, triagedByNurse: false })),
    ]).then(([enc, patient, rxs, labs, conditions, soap, { vitals, triagedByNurse }]) =>
      setData({
        encounter: enc ? { ...enc, soap: soap ?? enc.soap, vitals } : null,
        patient,
        prescriptions: rxs.filter(rx => rx.encounterId === encounterId),
        labOrders: labs.filter(l => l.encounterId === encounterId),
        diagnoses: encounterDiagnoses(conditions, encounterId),
        triagedByNurse,
      }));
  }, [patientId, encounterId]);

  if (!data) return <PageSkeleton />;
  const { encounter, patient } = data;
  if (!encounter || !patient) return <EmptyState icon={FileX} title="Visit not found" className="min-h-[50vh]" />;

  const v = encounter.vitals ?? {};
  const vitals = [
    { label: "Blood pressure", value: v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : null, unit: "mmHg" },
    { label: "Pulse", value: v.pulseBpm, unit: "bpm" },
    { label: "Temperature", value: v.temperatureC, unit: "°C" },
    { label: "SpO₂", value: v.spo2Percent, unit: "%" },
    { label: "Resp. rate", value: v.respirationRpm, unit: "/min" },
    { label: "Weight", value: v.weightKg, unit: "kg" },
    { label: "Height", value: v.heightCm, unit: "cm" },
    { label: "BMI", value: v.heightCm && v.weightKg ? calculateBMI(v.heightCm, v.weightKg) : null, unit: "" },
  ].filter(x => x.value);
  const rxItems = data.prescriptions.flatMap(rx => rx.items);
  const soapEntries = SOAP_LABELS.filter(s => encounter.soap?.[s.key]);
  const time = encounter.startedAt ? new Date(encounter.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          back={{ href: ROUTES.PATIENT(patientId), label: patient.name.full }}
          title="Visit summary"
          description={<span className="flex flex-wrap items-center gap-2">{formatDate(encounter.startedAt)} · {time} <StatusBadge status={encounter.status} /></span>}
        >
          {rxItems.length > 0 && (
            <Button variant="outline" onClick={() => window.print()}><Printer /> Print prescription</Button>
          )}
        </PageHeader>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 no-print">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard icon={NotebookPen} iconClassName="text-clinical-notes" title="Consultation notes">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Chief complaint</p>
                <p className="mt-0.5 text-base font-medium text-foreground">{encounter.chiefComplaint || "—"}</p>
              </div>
              {soapEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes recorded.</p>
              ) : (
                <dl className="grid gap-4 sm:grid-cols-2">
                  {soapEntries.map(({ key, label }) => (
                    <div key={key} className="rounded-lg bg-muted/40 p-3">
                      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{encounter.soap[key]}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </SectionCard>

          <SectionCard icon={Stethoscope} iconClassName="text-clinical-diagnosis" title="Diagnoses" count={data.diagnoses.length} noPadding>
            {data.diagnoses.length === 0 ? (
              <EmptyState title="No diagnoses recorded" className="py-8" />
            ) : (
              <ul className="divide-y">
                {data.diagnoses.map(d => (
                  <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <Star className={d.isPrimary ? "h-4 w-4 fill-current text-status-warning-text" : "h-4 w-4 text-transparent"} />
                    <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{d.icdCode}</span>
                    <span className="flex-1 text-sm font-medium text-foreground">{d.name}</span>
                    {d.isPrimary && <span className="text-xs font-medium text-status-warning-text">Primary</span>}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard icon={HeartPulse} iconClassName="text-clinical-vitals" title="Vitals"
            headerRight={data.triagedByNurse && (
              <span className="inline-flex items-center gap-1 rounded-full bg-status-teal-bg px-2 py-0.5 text-xs font-medium text-status-teal-text">
                <UserCheck className="h-3 w-3" /> Nurse triage
              </span>
            )}>
            {vitals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vitals recorded.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {vitals.map(x => (
                  <div key={x.label}>
                    <dt className="text-xs text-muted-foreground">{x.label}</dt>
                    <dd className="text-sm font-semibold tabular-nums text-foreground">{x.value} <span className="text-xs font-normal text-muted-foreground">{x.unit}</span></dd>
                  </div>
                ))}
              </dl>
            )}
          </SectionCard>

          <SectionCard icon={Pill} iconClassName="text-clinical-rx" title="Prescriptions" count={rxItems.length} noPadding>
            {rxItems.length === 0 ? (
              <EmptyState title="No prescriptions" className="py-6" />
            ) : (
              <ul className="divide-y">
                {data.prescriptions.map(rx => rx.items.map(item => (
                  <li key={`${rx.id}-${item.id}`} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{item.displayName}</p>
                      <StatusBadge status={rx.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{rxDirections(item)} · Qty {item.quantity}</p>
                  </li>
                )))}
              </ul>
            )}
          </SectionCard>

          <SectionCard icon={FlaskConical} iconClassName="text-clinical-lab" title="Lab orders" count={data.labOrders.length} noPadding>
            {data.labOrders.length === 0 ? (
              <EmptyState title="No lab orders" className="py-6" />
            ) : (
              <ul className="divide-y">
                {data.labOrders.map(lab => (
                  <li key={lab.id} className="flex items-center justify-between gap-2 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{lab.tests.map(t => t.display).join(", ")}</p>
                      {lab.priority !== "routine" && <p className="text-xs font-medium uppercase text-status-error-text">{lab.priority}</p>}
                    </div>
                    <StatusBadge status={lab.status} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <RxPrint patient={patient} items={rxItems} prescriber={user?.name} date={encounter.startedAt} />
    </div>
  );
}
