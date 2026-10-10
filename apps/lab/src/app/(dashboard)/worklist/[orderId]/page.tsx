"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, CircleDashed, Clock, FlaskConical, Info, Loader2, Printer, QrCode, StickyNote } from "lucide-react";
import { apiErrorMessage } from "@curo/web/api";
import { printOnly } from "@curo/web/print";
import { QueryContent, allOf } from "@curo/web/query";
import { Button } from "@curo/web/ui/button";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { PriorityBadge } from "@/components/features/orders/PriorityBadge";
import { ResultsTable } from "@/components/features/orders/ResultsTable";
import { PatientCard } from "@/components/features/patients/PatientCard";
import { LabReportUpload } from "@/components/features/worklist/LabReportUpload";
import { receiveOrder, type LabResult } from "@/lib/api/lab";
import { ROUTES } from "@/lib/constants";
import { STEP_ACTION, nextStep, orderNumber, orderStatus } from "@/lib/orders";
import { invalidateOrder, orderQueries, patientQueries } from "@/lib/queries";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { LabOrder, Patient } from "@/types";

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const order = useQuery(orderQueries.detail(orderId));

  return (
    <QueryContent query={order} what="this order">
      {o => {
        if (!o) notFound();
        return <OrderDetails order={o} />;
      }}
    </QueryContent>
  );
}

function OrderDetails({ order }: { order: LabOrder }) {
  const details = allOf(useQuery(patientQueries.detail(order.patientId)), useQuery(orderQueries.results(order.id)));

  return (
    <QueryContent query={details} what="this order">
      {([patient, results]) => {
        if (!patient) notFound();
        return <OrderView order={order} patient={patient} results={results} />;
      }}
    </QueryContent>
  );
}

function OrderView({ order, patient, results }: { order: LabOrder; patient: Patient; results: LabResult[] }) {
  const queryClient = useQueryClient();
  const receive = useMutation({
    mutationFn: () => receiveOrder(order.id),
    onSuccess: () => invalidateOrder(queryClient, order),
    onError: err => toast.error(apiErrorMessage(err, "The sample couldn't be marked as received.")),
  });
  const step = nextStep(order);
  const completed = order.status === "completed";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        back={{ href: ROUTES.WORKLIST, label: "Worklist" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            Order <span className="font-mono">{orderNumber(order)}</span>
            <StatusBadge status={orderStatus(order)} />
            <PriorityBadge priority={order.priority} />
          </span>
        }
        description={`Ordered ${formatDate(order.createdAt)}`}
      >
        {/* One primary action: the next step. Entering results also receives the sample. */}
        {step === "receive" && (
          <>
            <Button asChild variant="outline">
              <Link href={STEP_ACTION.results.href(order.id)}>{STEP_ACTION.results.label}</Link>
            </Button>
            <Button onClick={() => receive.mutate()} disabled={receive.isPending}>
              {receive.isPending && <Loader2 className="animate-spin" />} {STEP_ACTION.receive.label}
            </Button>
          </>
        )}
        {step === "results" && (
          <Button asChild>
            <Link href={STEP_ACTION.results.href(order.id)}>{STEP_ACTION.results.label}</Link>
          </Button>
        )}
      </PageHeader>

      {order.status === "draft" && (
        <p className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" /> The doctor hasn&apos;t sent this order to the lab, or has taken it back. There&apos;s nothing to do yet.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PatientCard patient={patient} href={ROUTES.PATIENT(patient.id)} />

          <SectionCard icon={FlaskConical} iconClassName="text-primary" title="Tests" count={order.tests.length} noPadding>
            <ul className="divide-y">
              {order.tests.map((test, i) => (
                <li key={`${test.testId}:${i}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{test.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{test.testId}</p>
                  </div>
                  {completed ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-status-success-text">
                      <CheckCircle2 className="size-3.5" /> Reported
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <CircleDashed className="size-3.5" /> Waiting
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>

          {results.length > 0 && (
            <SectionCard icon={CheckCircle2} iconClassName="text-status-success-text" title="Results">
              <div className="space-y-6">
                {results.map(result => (
                  <div key={result.id} className="space-y-2">
                    <p className="text-xs text-muted-foreground">Reported {formatDateTime(result.performedAt)}</p>
                    <ResultsTable result={result} />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* The labels are for the samples: once the results are in, they're done with. */}
          {!completed && <SampleLabels order={order} patient={patient} />}

          {completed && <LabReportUpload orderId={order.id} patientId={order.patientId} encounterId={order.encounterId} />}
        </div>

        <div className="space-y-6">
          <SectionCard icon={Clock} iconClassName="text-primary" title="Progress">
            <ol className="space-y-3">
              {[
                { label: "Sent to lab", time: order.sentToLabAt },
                { label: "Sample received", time: order.receivedAt },
                { label: "Results reported", time: order.completedAt },
              ].map(({ label, time }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", time ? "bg-primary" : "bg-muted-foreground/25")} />
                  <div>
                    <p className={cn("text-sm font-medium", time ? "text-foreground" : "text-muted-foreground")}>{label}</p>
                    {time && <p className="text-xs text-muted-foreground">{formatDateTime(time)}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>

          {order.notesToLab && (
            <SectionCard icon={StickyNote} iconClassName="text-status-warning-text" title="Notes from the doctor">
              <p className="text-sm text-foreground">{order.notesToLab}</p>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}

/** A label to print and stick on each sample tube, and the print-only sheet of them. */
function SampleLabels({ order, patient }: { order: LabOrder; patient: Patient }) {
  const labels = order.testQrs ?? [];
  if (labels.length === 0) return null;

  return (
    <>
      <SectionCard
        icon={QrCode}
        iconClassName="text-primary"
        title="Sample labels"
        count={labels.length}
        className="no-print"
        headerRight={
          <Button variant="outline" size="sm" onClick={() => printOnly("sample-labels")}>
            <Printer /> Print labels
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {labels.map((t, i) => (
            <div key={`${t.testCode}-${i}`} className="rounded-lg border p-3 text-center">
              {t.qrBase64
                // eslint-disable-next-line @next/next/no-img-element -- data: URL QR code; next/image adds nothing
                ? <img src={t.qrBase64} alt={`QR ${t.display}`} className="mx-auto size-24" />
                : <div className="mx-auto flex size-24 items-center justify-center text-xs text-muted-foreground">No QR</div>}
              <p className="mt-1 text-xs font-medium text-foreground">{t.display}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{t.testCode}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div id="sample-labels" className="hidden">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: 16 }}>
          {labels.map((t, i) => (
            <div key={`p-${t.testCode}-${i}`} style={{ border: "1px solid #000", padding: 8, width: 200, fontFamily: "sans-serif" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URL QR code; next/image adds nothing */}
              {t.qrBase64 && <img src={t.qrBase64} alt="" style={{ width: 96, height: 96 }} />}
              <div style={{ fontSize: 12, fontWeight: 700 }}>{t.display} ({t.testCode})</div>
              <div style={{ fontSize: 11 }}>{patient.name.full}</div>
              <div style={{ fontSize: 10, color: "#333" }}>{patient.phn ? `PHN ${patient.phn}` : patient.mrn}</div>
              <div style={{ fontSize: 9, color: "#666" }}>Order {orderNumber(order)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
