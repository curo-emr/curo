import { LabResultList } from "@curo/web/ui/lab-results";
import type { LabResult } from "@/lib/api/lab";

// One filed report's values, out-of-range ones in bold with their flag, then the lab's conclusion.
export function ResultsTable({ result }: { result: LabResult }) {
  return (
    <div className="space-y-3">
      {result.results.length === 0 ? (
        <p className="text-sm text-muted-foreground">The results are in the uploaded report file.</p>
      ) : (
        <LabResultList results={result.results} />
      )}
      {result.conclusion && (
        <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-foreground">{result.conclusion}</p>
      )}
    </div>
  );
}
