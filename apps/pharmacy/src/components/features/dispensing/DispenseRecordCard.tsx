import { Card, CardContent } from "@curo/web/ui/card";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import type { DispenseRecord } from "@/lib/api/pharmacy";

export function DispenseRecordCard({ record }: { record: DispenseRecord }) {
  return (
    <Card className="shadow-sm border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm text-slate-900">Receipt: {record.receiptNumber}</span>
          <span className="text-xs text-slate-400">{formatDateTime(record.dispensedAt)}</span>
        </div>
        <div className="bg-slate-50 rounded-md p-3 space-y-1.5">
          {record.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-slate-600">{item.medicationName}</span>
              <span className="font-medium text-slate-900">x{item.quantity}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
          <span>Dispensed by: {record.dispensedBy}</span>
          <span className="font-medium text-slate-600">{formatCurrency(record.totalAmount)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
