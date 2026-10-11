"use client";

import { FileText, Loader2 } from "lucide-react";
import { openDocument, openPdf } from "@curo/web/api";
import { isAbnormalResult, resultFlag } from "@curo/web/clinical";
import { Button } from "@curo/web/ui/button";
import { ResultFlagBadge } from "@curo/web/ui/result-flag-badge";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { cn } from "@curo/web/ui/utils";
import type { DocumentRef } from "@/lib/api/documents";
import { useDoctorName } from "@/lib/hooks/useDirectory";
import { useOpener } from "@/lib/hooks/useOpener";
import { formatDate } from "@/lib/format";
import { LAB_TEST_STATUS } from "@/lib/status";
import type { LabReport, LabResultValue, LabTest } from "@/types";

interface LabTestCardProps {
  test: LabTest;
  /** The lab's report, once the results are in. */
  report?: LabReport;
  /** Report files the lab uploaded for this test. */
  files: DocumentRef[];
}

// One lab test: where it is, then its results and report files once the lab sends them.
export function LabTestCard({ test, report, files }: LabTestCardProps) {
  const doctorName = useDoctorName();
  const { status, label } = LAB_TEST_STATUS[test.status];

  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{test.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Asked for by {doctorName(test.doctorId)} · {formatDate(test.orderedAt)}
            {report?.issued && ` · Results ${formatDate(report.issued)}`}
          </p>
        </div>
        <StatusBadge status={status} label={label} className="shrink-0" />
      </div>
      {report && report.results.length > 0 && <ResultList results={report.results} />}
      {report?.conclusion && <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">{report.conclusion}</p>}
      <ReportFiles pdfBase64={report?.pdfBase64} files={files} />
    </li>
  );
}

// Each value with its unit, its normal range and, when it's outside, a flag.
function ResultList({ results }: { results: LabResultValue[] }) {
  return (
    <ul className="divide-y rounded-lg border">
      {results.map((r, i) => {
        const flag = resultFlag(r.interpretation);
        const abnormal = isAbnormalResult(flag);
        return (
          <li key={`${r.code}:${i}`} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm text-foreground">{r.display}</p>
              {r.referenceRange && <p className="text-xs text-muted-foreground">Normal range {r.referenceRange}{r.unit && ` ${r.unit}`}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={cn("text-sm tabular-nums text-foreground", abnormal && "font-semibold")}>
                {r.value} {r.unit && <span className="text-xs font-normal text-muted-foreground">{r.unit}</span>}
              </span>
              {abnormal && <ResultFlagBadge flag={flag} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ReportFiles({ pdfBase64, files }: { pdfBase64?: string; files: DocumentRef[] }) {
  const { opening, open } = useOpener();
  if (!pdfBase64 && files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {pdfBase64 && (
        <Button variant="outline" size="sm" disabled={opening === "pdf"} onClick={() => open("pdf", () => openPdf(pdfBase64))}>
          {opening === "pdf" ? <Loader2 className="animate-spin" /> : <FileText />} Lab report
        </Button>
      )}
      {files.map(f => (
        <Button key={f.id} variant="outline" size="sm" disabled={opening === f.id} onClick={() => open(f.id, () => openDocument(f.id))}>
          {opening === f.id ? <Loader2 className="animate-spin" /> : <FileText />} {f.fileName || "Report file"}
        </Button>
      ))}
    </div>
  );
}
