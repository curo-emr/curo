import { LabOrder, Patient } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Clock, ArrowRight } from "lucide-react";
import { getPatientName, formatDate } from "@/lib/utils";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { orderStatus } from "@/lib/order-status";

interface RecentActivityFeedProps {
  orders: LabOrder[];
  patients: Patient[];
}

/** The lab's newest orders, newest first. */
export function RecentActivityFeed({ orders, patients }: RecentActivityFeedProps) {
  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted/50 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {orders.map(order => (
            <div key={order.id} className="px-4 py-3 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full shrink-0" style={{
                backgroundColor: order.priority === 'stat' ? '#dc2626' : order.priority === 'urgent' ? '#d97706' : '#94a3b8'
              }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">
                  <span className="font-medium">{order.id.slice(0, 8).toUpperCase()}</span>
                  {' '}<ArrowRight className="h-3 w-3 inline text-muted-foreground" />{' '}
                  {getPatientName(order.patientId, patients)}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
              </div>
              <StatusBadge status={orderStatus(order)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
