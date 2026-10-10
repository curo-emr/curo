import { Card } from "@curo/web/ui/card";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import type { DispenseRecord } from "@/lib/api/pharmacy";

/** One dispense as its receipt reads: what was handed over, by whom, and the amount. */
export function DispenseRecordCard({ record }: { record: DispenseRecord }) {
  return (
    <Card className="gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-sm font-medium text-foreground">{record.receiptNumber}</span>
        <span className="text-xs text-muted-foreground">{formatDateTime(record.dispensedAt)}</span>
      </div>
      <ul className="space-y-1.5 rounded-lg bg-muted/50 p-3">
        {record.items.map((item, idx) => (
          <li key={idx} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground">{item.medicationName}</span>
            <span className="font-medium tabular-nums text-foreground">×{item.quantity}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Dispensed by {record.dispensedBy}</span>
        <span className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(record.totalAmount)}</span>
      </div>
    </Card>
  );
}
