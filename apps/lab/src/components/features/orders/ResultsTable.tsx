import { isAbnormalResult } from "@curo/web/clinical";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@curo/web/ui/table";
import type { LabResult } from "@/lib/api/lab";
import { cn } from "@/lib/utils";
import { ResultFlagBadge } from "./ResultFlagBadge";

// One filed report's values, out-of-range ones in bold with their flag, then the lab's conclusion.
export function ResultsTable({ result }: { result: LabResult }) {
  return (
    <div className="space-y-3">
      {result.results.length === 0 ? (
        <p className="text-sm text-muted-foreground">The results are in the uploaded report file.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Reference range</TableHead>
                <TableHead className="w-24">Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.results.map((item, i) => (
                <TableRow key={`${item.testCode}:${i}`}>
                  <TableCell className="text-foreground">{item.testName}</TableCell>
                  <TableCell className={cn("tabular-nums", isAbnormalResult(item.flag) && "font-semibold text-foreground")}>
                    {item.value} {item.unit && <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.referenceRange || "—"}</TableCell>
                  <TableCell>{isAbnormalResult(item.flag) && <ResultFlagBadge flag={item.flag} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {result.conclusion && (
        <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-foreground">{result.conclusion}</p>
      )}
    </div>
  );
}
