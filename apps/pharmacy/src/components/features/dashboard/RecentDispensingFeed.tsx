import type { DispenseRecord } from "@/lib/api/pharmacy";
import { Patient } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Clock, ArrowRight } from "lucide-react";
import { getPatientName, formatDate, formatCurrency } from "@/lib/utils";

interface RecentDispensingFeedProps {
  records: DispenseRecord[];
  patients: Patient[];
}

/** The latest dispenses, latest first. */
export function RecentDispensingFeed({ records, patients }: RecentDispensingFeedProps) {
  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted/50 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Recent Dispensing
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {records.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No dispensing activity yet.</div>
          ) : (
            records.map(record => (
              <div key={record.id} className="px-4 py-3 flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">
                    <span className="font-medium">{record.prescriptionId.slice(0, 8).toUpperCase()}</span>
                    {' '}<ArrowRight className="h-3 w-3 inline text-muted-foreground" />{' '}
                    {getPatientName(record.patientId, patients)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(record.dispensedAt)} &middot; {record.items.length} item{record.items.length !== 1 ? 's' : ''} &middot; {formatCurrency(record.totalAmount)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
