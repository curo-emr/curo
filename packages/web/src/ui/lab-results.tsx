import { isAbnormalResult, resultFlag } from "../clinical";
import type { LabReport, LabResultValue } from "../fhir";
import { ResultFlagBadge } from "./result-flag-badge";
import { cn } from "./utils";

/**
 * A report's values: each with its normal range and unit, and a flag when it's
 * outside the range. One list for every portal, laid out to fit a phone.
 */
export function LabResultList({ results, className }: { results: LabResultValue[]; className?: string }) {
  return (
    <ul className={cn("divide-y rounded-lg border", className)}>
      {results.map((r, i) => {
        const flag = resultFlag(r.interpretation);
        const abnormal = isAbnormalResult(flag);
        return (
          <li key={`${r.code}:${i}`} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm text-foreground">{r.display}</p>
              {r.referenceRange && (
                <p className="text-xs text-muted-foreground">Normal range {r.referenceRange}{r.unit && ` ${r.unit}`}</p>
              )}
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

/**
 * What a lab reported, as every portal shows it: the typed values, the results
 * pasted as text (kept as pasted, its columns lined up), then the conclusion.
 */
export function LabReportBody({ report }: { report: Pick<LabReport, "results" | "resultsText" | "conclusion"> }) {
  const { results, resultsText, conclusion } = report;
  return (
    // min-w-0 keeps a wide printout scrolling in its box, not stretching the page.
    <div className="min-w-0 space-y-3">
      {results.length > 0 && <LabResultList results={results} />}
      {resultsText && (
        <pre className="overflow-x-auto rounded-lg border px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground">
          {resultsText}
        </pre>
      )}
      {conclusion && <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">{conclusion}</p>}
    </div>
  );
}
