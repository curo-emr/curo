import { LabOrder, Patient } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ArrowRight } from "lucide-react";
import { getPatientName, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface RecentActivityFeedProps {
  orders: LabOrder[];
  patients: Patient[];
}

export function RecentActivityFeed({ orders, patients }: RecentActivityFeedProps) {
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

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
          {recentOrders.map(order => (
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
              <StatusBadge status={order.status} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
