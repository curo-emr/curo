"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import type { LabOrder, LabReport } from "@/types";
import { Button } from "@curo/web/ui/button";
import { LabResultList } from "@curo/web/ui/lab-results";
import { StatusBadge, type Status } from "@curo/web/ui/status-badge";
import { openDocument, openPdf } from "@curo/web/api";
import type { DocumentRef } from "@/lib/api/documents";
import { formatDate } from "@/lib/utils";
import { catalogQueries, patientQueries } from "@/lib/queries";

/** A patient's lab orders, each with its lab, its results and any files the lab uploaded. */
export function LabOrderList({ patientId, orders }: { patientId: string; orders: LabOrder[] }) {
  const reports = useQuery(patientQueries.labReports(patientId));
  // Labs only name the orders and files only add downloads, so the orders show without them.
  const labs = useQuery(catalogQueries.labs(true)).data ?? [];
  const files = useQuery(patientQueries.documents(patientId)).data ?? [];

  return (
    <QueryContent query={reports} what="lab results">
      {allReports => (
        <ul className="divide-y">
          {orders.map(order => (
            <LabOrderRow
              key={order.id}
              order={order}
              labName={labs.find(l => l.id === order.labId)?.name ?? "Lab not recorded"}
              report={allReports.find(r => r.orderId === order.id)}
              files={files.filter(f => f.type === "lab-report" && f.relatedResourceId === order.id)}
            />
          ))}
        </ul>
      )}
    </QueryContent>
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
          <p className="text-sm font-medium text-foreground">{order.tests.map(t => t.display).join(", ") || "Lab order"}</p>
          <p className="text-xs text-muted-foreground">
            {labName} · Ordered {formatDate(order.createdAt)}
            {order.priority !== "routine" && <span className="font-medium uppercase text-status-error-text"> · {order.priority}</span>}
            {report?.issued && <> · Reported {formatDate(report.issued)}</>}
          </p>
          {order.notesToLab && <p className="text-xs italic text-muted-foreground">{order.notesToLab}</p>}
        </div>
        <StatusBadge status={stageOf(order, report)} />
      </div>

      {report && report.results.length > 0 && <LabResultList results={report.results} />}
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
