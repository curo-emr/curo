import { LabOrder, Patient, LabTestCatalogItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { getPatientName, getTestName } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

interface UrgentOrdersListProps {
  orders: LabOrder[];
  patients: Patient[];
  testCatalog: LabTestCatalogItem[];
}

export function UrgentOrdersList({ orders, patients, testCatalog }: UrgentOrdersListProps) {
  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted/50 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-status-warning-text" />
            Urgent Orders
          </CardTitle>
          <Badge variant="secondary" className="bg-status-warning-bg text-status-warning-text hover:bg-status-warning-bg">
            {orders.length} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No urgent orders at this time.</div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="p-4 hover:bg-muted transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-foreground">
                        {order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <Badge variant="outline" className={order.priority === 'stat' ? 'text-status-error-text border-status-error-border bg-status-error-bg' : 'text-status-warning-text border-status-warning-border bg-status-warning-bg'}>
                        {order.priority.toUpperCase()}
                      </Badge>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getPatientName(order.patientId, patients)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.tests.map(t => getTestName(t.testId, testCatalog)).join(', ')}
                    </p>
                  </div>
                  <Link href={ROUTES.ORDER(order.id)}>
                    <Button variant="outline" size="sm" className="h-8 text-xs shrink-0">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
