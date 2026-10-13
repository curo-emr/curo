import { LabReportBody } from "@curo/web/ui/lab-results";
import type { LabResult } from "@/lib/api/lab";

// One filed report: its values and text, out-of-range values in bold with their flag, then the lab's conclusion.
export function ResultsTable({ result }: { result: LabResult }) {
  return (
    <div className="space-y-3">
      {result.results.length === 0 && !result.resultsText && (
        <p className="text-sm text-muted-foreground">The results are in the uploaded report file.</p>
      )}
      <LabReportBody report={result} />
    </div>
  );
}
