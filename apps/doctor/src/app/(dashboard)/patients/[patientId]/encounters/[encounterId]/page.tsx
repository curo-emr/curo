"use client";

import { use } from "react";
import { FileX, HeartPulse, NotebookPen, Pill, Printer, Star, Stethoscope, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import type { Vitals } from "@/types";
import { Button } from "@curo/web/ui/button";
import { EmptyState } from "@curo/web/ui/empty-state";
import { LoadError } from "@curo/web/ui/load-error";
import { PageHeader } from "@curo/web/ui/page-header";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { SectionCard } from "@curo/web/ui/section-card";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { RX_PRINT_ID, RxPrint, rxDirections } from "@/components/features/prescriptions/RxPrint";
import { LAB_SLIP_PRINT_ID, LabSlipPrint } from "@/components/features/labs/LabSlipPrint";
import { VisitLabOrders, useVisitLabOrders } from "@/components/features/labs/VisitLabOrders";
import { useAuth } from "@/contexts/AuthContext";
import { ROUTES } from "@/lib/constants";
import { encounterDiagnoses } from "@/lib/clinical";
import { catalogQueries, patientQueries, visitQueries } from "@/lib/queries";
import { printOnly } from "@curo/web/print";
import { calculateBMI, formatDate } from "@/lib/utils";

const SOAP_LABELS = [
  { key: "subjective", label: "Subjective" },
  { key: "objective", label: "Objective" },
  { key: "assessment", label: "Assessment" },
  { key: "plan", label: "Plan" },
] as const;

const vitalRows = (v: Partial<Vitals>) => [
  { label: "Blood pressure", value: v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : null, unit: "mmHg" },
  { label: "Pulse", value: v.pulseBpm, unit: "bpm" },
  { label: "Temperature", value: v.temperatureC, unit: "°C" },
  { label: "SpO₂", value: v.spo2Percent, unit: "%" },
  { label: "Resp. rate", value: v.respirationRpm, unit: "/min" },
  { label: "Weight", value: v.weightKg, unit: "kg" },
  { label: "Height", value: v.heightCm, unit: "cm" },
  { label: "BMI", value: v.heightCm && v.weightKg ? calculateBMI(v.heightCm, v.weightKg) : null, unit: "" },
].filter(x => x.value);

// Each section loads its own part of the visit, so one failing shows as such.
export default function VisitSummaryPage({ params }: { params: Promise<{ patientId: string; encounterId: string }> }) {
  const { patientId, encounterId } = use(params);
  const { user } = useAuth();
  const encounter = useQuery(visitQueries.encounter(patientId, encounterId));
  const patient = useQuery(patientQueries.detail(patientId));
  const soap = useQuery(visitQueries.soap(patientId, encounterId));
  const vitals = useQuery(visitQueries.vitals(patientId, encounterId));
  const conditions = useQuery(patientQueries.conditions(patientId));
  const prescriptions = useQuery({
    ...patientQueries.prescriptions(patientId),
    select: rxs => rxs.filter(rx => rx.encounterId === encounterId),
  });
  // For the printouts; the sections on screen load their own.
  const labOrders = useVisitLabOrders(patientId, encounterId).data ?? [];
  const labs = useQuery(catalogQueries.labs(true)).data ?? [];
  const labSlipQr = useQuery(visitQueries.labSlipQr(patientId, encounterId)).data ?? null;

  if (encounter.data === undefined || patient.data === undefined) {
    const failed = encounter.isError ? encounter : patient.isError ? patient : null;
    return failed
      ? <LoadError what="this visit" onRetry={() => void failed.refetch()} retrying={failed.isFetching} className="min-h-[50vh]" />
      : <PageSkeleton />;
  }
  const visit = encounter.data;
  const pt = patient.data;
  if (!visit || !pt) return <EmptyState icon={FileX} title="Visit not found" className="min-h-[50vh]" />;

  const rxs = prescriptions.data ?? [];
  const rxItems = rxs.flatMap(rx => rx.items);
  const time = visit.startedAt ? new Date(visit.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          back={{ href: ROUTES.PATIENT(patientId), label: pt.name.full }}
          title="Visit summary"
          description={<span className="flex flex-wrap items-center gap-2">{formatDate(visit.startedAt)} · {time} <StatusBadge status={visit.status} /></span>}
        >
          {labOrders.length > 0 && (
            <Button variant="outline" onClick={() => printOnly(LAB_SLIP_PRINT_ID)}><Printer /> Print lab slip</Button>
          )}
          {rxItems.length > 0 && (
            <Button variant="outline" onClick={() => printOnly(RX_PRINT_ID)}><Printer /> Print prescription</Button>
          )}
        </PageHeader>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 no-print">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard icon={NotebookPen} iconClassName="text-clinical-notes" title="Consultation notes">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Chief complaint</p>
                <p className="mt-0.5 text-base font-medium text-foreground">{visit.chiefComplaint || "—"}</p>
              </div>
              <QueryContent query={soap} what="the notes">
                {notes => {
                  const entries = SOAP_LABELS.flatMap(({ key, label }) => {
                    const text = (notes ?? visit.soap)?.[key];
                    return text ? [{ key, label, text }] : [];
                  });
                  return entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes recorded.</p>
                  ) : (
                    <dl className="grid gap-4 sm:grid-cols-2">
                      {entries.map(({ key, label, text }) => (
                        <div key={key} className="rounded-lg bg-muted/40 p-3">
                          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                          <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{text}</dd>
                        </div>
                      ))}
                    </dl>
                  );
                }}
              </QueryContent>
            </div>
          </SectionCard>

          <SectionCard icon={Stethoscope} iconClassName="text-clinical-diagnosis" title="Diagnoses"
            count={conditions.data && encounterDiagnoses(conditions.data, encounterId).length} noPadding>
            <QueryContent query={conditions} what="diagnoses">
              {list => {
                const diagnoses = encounterDiagnoses(list, encounterId);
                return diagnoses.length === 0 ? (
                  <EmptyState title="No diagnoses recorded" className="py-8" />
                ) : (
                  <ul className="divide-y">
                    {diagnoses.map(d => (
                      <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                        <Star className={d.isPrimary ? "h-4 w-4 fill-current text-status-warning-text" : "h-4 w-4 text-transparent"} />
                        <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{d.icdCode}</span>
                        <span className="flex-1 text-sm font-medium text-foreground">{d.name}</span>
                        {d.isPrimary && <span className="text-xs font-medium text-status-warning-text">Primary</span>}
                      </li>
                    ))}
                  </ul>
                );
              }}
            </QueryContent>
          </SectionCard>

          <VisitLabOrders patientId={patientId} encounterId={encounterId} />
        </div>

        <div className="space-y-6">
          <SectionCard icon={HeartPulse} iconClassName="text-clinical-vitals" title="Vitals"
            headerRight={vitals.data?.triagedByNurse && (
              <span className="inline-flex items-center gap-1 rounded-full bg-status-teal-bg px-2 py-0.5 text-xs font-medium text-status-teal-text">
                <UserCheck className="h-3 w-3" /> Nurse triage
              </span>
            )}>
            <QueryContent query={vitals} what="vitals">
              {({ vitals: v }) => {
                const rows = vitalRows(v);
                return rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No vitals recorded.</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {rows.map(x => (
                      <div key={x.label}>
                        <dt className="text-xs text-muted-foreground">{x.label}</dt>
                        <dd className="text-sm font-semibold tabular-nums text-foreground">{x.value} <span className="text-xs font-normal text-muted-foreground">{x.unit}</span></dd>
                      </div>
                    ))}
                  </dl>
                );
              }}
            </QueryContent>
          </SectionCard>

          <SectionCard icon={Pill} iconClassName="text-clinical-rx" title="Prescriptions" count={rxItems.length} noPadding>
            <QueryContent query={prescriptions} what="prescriptions">
              {() => rxItems.length === 0 ? (
                <EmptyState title="No prescriptions" className="py-6" />
              ) : (
                <ul className="divide-y">
                  {rxs.map(rx => rx.items.map(item => (
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
            </QueryContent>
          </SectionCard>
        </div>
      </div>

      <RxPrint patient={pt} items={rxItems} prescriber={user?.name} date={visit.startedAt} />
      <LabSlipPrint patient={pt} orders={labOrders} labs={labs} qrBase64={labSlipQr}
        doctor={user?.name} date={visit.startedAt} />
    </div>
  );
}
