"use client";

import { useState } from "react";
import { FileText, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Lab, LabOrder, LabReport, LabResultValue } from "@/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { openDocument, type DocumentRef } from "@/lib/api/documents";
import { openPdf } from "@/lib/api/labs";
import { cn, formatDate } from "@/lib/utils";

interface Props {
  orders: LabOrder[];
  /** The visit's lab reports, from every lab. */
  reports: LabReport[];
  /** Report files the labs uploaded for the visit's orders. */
  files: DocumentRef[];
  labs: Lab[];
}

/** A visit's lab tests: where each went, how far it has got, and what the lab reported. */
export function VisitLabOrders({ orders, reports, files, labs }: Props) {
  return (
    <SectionCard icon={FlaskConical} iconClassName="text-clinical-lab" title="Lab orders" count={orders.length} noPadding>
      {orders.length === 0 ? (
        <EmptyState title="No lab orders" className="py-6" />
      ) : (
        <ul className="divide-y">
          {orders.map(order => (
            <LabOrderRow
              key={order.id}
              order={order}
              labName={labs.find(l => l.id === order.labId)?.name ?? "Lab not recorded"}
              report={reports.find(r => r.orderId === order.id)}
              files={files.filter(f => f.relatedResourceId === order.id)}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function stageOf(order: LabOrder, report?: LabReport): string {
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
