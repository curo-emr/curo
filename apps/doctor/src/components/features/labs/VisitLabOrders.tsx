"use client";

import { useState } from "react";
import { FileText, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import type { LabOrder, LabReport, LabResultValue } from "@/types";
import { Button } from "@curo/web/ui/button";
import { EmptyState } from "@curo/web/ui/empty-state";
import { SectionCard } from "@curo/web/ui/section-card";
import { StatusBadge, type Status } from "@curo/web/ui/status-badge";
import { openDocument, type DocumentRef } from "@/lib/api/documents";
import { openPdf } from "@/lib/api/labs";
import { cn, formatDate } from "@/lib/utils";
import { catalogQueries, patientQueries, visitQueries } from "@/lib/queries";

/** The visit's lab orders, each with its lab, its report and any files the lab uploaded. */
export function useVisitLabOrders(patientId: string, encounterId: string) {
  return useQuery({
    ...patientQueries.labOrders(patientId),
    select: (orders: LabOrder[]) => orders.filter(o => o.encounterId === encounterId),
  });
}

export function VisitLabOrders({ patientId, encounterId }: { patientId: string; encounterId: string }) {
  const orders = useVisitLabOrders(patientId, encounterId);
  const reports = useQuery(visitQueries.labReports(patientId, encounterId));
  // Labs only name the orders and files only add downloads, so the orders show without them.
  const labs = useQuery(catalogQueries.labs(true)).data ?? [];
  const files = useQuery(patientQueries.documents(patientId)).data ?? [];

  return (
    <SectionCard icon={FlaskConical} iconClassName="text-clinical-lab" title="Lab orders" count={orders.data?.length} noPadding>
      <QueryContent query={orders} what="lab orders">
        {list => list.length === 0 ? (
          <EmptyState title="No lab orders" className="py-6" />
        ) : (
          <QueryContent query={reports} what="lab results">
            {visitReports => (
              <ul className="divide-y">
                {list.map(order => (
                  <LabOrderRow
                    key={order.id}
                    order={order}
                    labName={labs.find(l => l.id === order.labId)?.name ?? "Lab not recorded"}
                    report={visitReports.find(r => r.orderId === order.id)}
                    files={files.filter(f => f.type === "lab-report" && f.relatedResourceId === order.id)}
                  />
                ))}
              </ul>
            )}
          </QueryContent>
        )}
      </QueryContent>
    </SectionCard>
  );
}

function stageOf(order: LabOrder, report?: LabReport): Status {
  if (report || order.status === "completed") return "results_ready";
  return order.receivedAt ? "sample_received" : "sent_to_lab";
}

function LabOrderRow({ order, labName, report, files }: {
  order: LabOrder;
  labName: string;
  report?: LabReport;
  files: DocumentRef[];
}) {
  const [opening, setOpening] = useState<string | null>(null);

  const open = async (key: string, action: () => Promise<void> | void) => {
    setOpening(key);
    try {
      await action();
    } catch {
      toast.error("Could not open the report");
    } finally {
      setOpening(null);
    }
  };

  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{order.tests.map(t => t.display).join(", ")}</p>
          <p className="text-xs text-muted-foreground">
            {labName}
            {order.priority !== "routine" && <span className="font-medium uppercase text-status-error-text"> · {order.priority}</span>}
            {report?.issued && <> · Reported {formatDate(report.issued)}</>}
          </p>
        </div>
        <StatusBadge status={stageOf(order, report)} />
      </div>

      {report && report.results.length > 0 && <ResultsTable results={report.results} />}
      {report?.conclusion && <p className="text-sm italic text-muted-foreground">{report.conclusion}</p>}

      {(report?.pdfBase64 || files.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {report?.pdfBase64 && (
            <Button variant="outline" size="sm" disabled={opening === "pdf"}
              onClick={() => open("pdf", () => openPdf(report.pdfBase64!))}>
              {opening === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />} Report PDF
            </Button>
          )}
          {files.map(f => (
            <Button key={f.id} variant="outline" size="sm" disabled={opening === f.id}
              onClick={() => open(f.id, () => openDocument(f.id))}>
              {opening === f.id ? <Loader2 className="animate-spin" /> : <FileText />} {f.fileName || "Report file"}
            </Button>
          ))}
        </div>
      )}
    </li>
  );
}

const ABNORMAL = new Set(["H", "HH", "L", "LL", "A", "AA"]);

function ResultsTable({ results }: { results: LabResultValue[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Test</th>
            <th className="px-3 py-2 font-medium">Result</th>
            <th className="px-3 py-2 font-medium">Reference range</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {results.map(r => {
            const abnormal = ABNORMAL.has(r.interpretation ?? "");
            return (
              <tr key={r.code}>
                <td className="px-3 py-2 text-foreground">{r.display}</td>
                <td className={cn("px-3 py-2 tabular-nums", abnormal ? "font-semibold text-status-error-text" : "text-foreground")}>
                  {r.value} {r.unit && <span className="text-xs font-normal text-muted-foreground">{r.unit}</span>}
                  {abnormal && <span className="ml-1 text-xs">({r.interpretation})</span>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.referenceRange ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
