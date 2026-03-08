import { Prescription } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatStatus } from "@/lib/utils";
import { Pill } from "lucide-react";

interface MedicationsTabProps {
  prescriptions: Prescription[];
}

export function MedicationsTab({ prescriptions }: MedicationsTabProps) {
  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Pill className="h-5 w-5 text-status-success-text" /> Prescriptions History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {prescriptions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No prescriptions on record.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground hidden md:table-header-group">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Medication</th>
                  <th className="px-6 py-3 font-medium">Directions</th>
                  <th className="px-6 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y block md:table-row-group">
                {prescriptions.flatMap(rx =>
                  rx.items.map(item => (
                    <tr key={`${rx.id}-${item.id}`} className="hover:bg-muted block md:table-row w-full p-4 md:p-0 border-b md:border-b-0 last:border-0">
                      <td className="md:px-6 md:py-4 align-top block md:table-cell mb-2 md:mb-0">
                        <span className="md:hidden font-semibold mr-2">Date:</span>
                        {formatDate(rx.createdAt)}
                      </td>
                      <td className="md:px-6 md:py-4 align-top block md:table-cell mb-2 md:mb-0 font-medium text-foreground">
                        <span className="md:hidden font-semibold mr-2 text-muted-foreground font-normal">Med:</span>
                        {item.displayName}
                      </td>
                      <td className="md:px-6 md:py-4 align-top block md:table-cell mb-2 md:mb-0 text-muted-foreground">
                        <span className="md:hidden font-semibold mr-2 text-muted-foreground">Sig:</span>
                        {item.dose} {item.route} {item.frequency} for {item.durationDays} days. Qty: {item.quantity}. {item.instructions}
                      </td>
                      <td className="md:px-6 md:py-4 align-top block md:table-cell text-left md:text-right">
                        <span className="md:hidden font-semibold mr-2 text-muted-foreground">Status:</span>
                        <Badge variant="outline" className={rx.status === 'sent_to_pharmacy' ? 'bg-primary/10 text-primary border-primary/20' : ''}>
                          {formatStatus(rx.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
