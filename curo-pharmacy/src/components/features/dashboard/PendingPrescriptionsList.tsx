import { Prescription, Patient } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { getPatientName } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

interface PendingPrescriptionsListProps {
  prescriptions: Prescription[];
  patients: Patient[];
}

export function PendingPrescriptionsList({ prescriptions, patients }: PendingPrescriptionsListProps) {
  const pending = prescriptions
    .filter(p => ['sent_to_pharmacy', 'active'].includes(p.status))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted/50 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-status-warning-text" />
            Pending Prescriptions
          </CardTitle>
          <Badge variant="secondary" className="bg-status-warning-bg text-status-warning-text hover:bg-status-warning-bg">
            {pending.length} awaiting
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {pending.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">All prescriptions have been processed.</div>
          ) : (
            pending.map(rx => (
              <div key={rx.id} className="p-4 hover:bg-muted transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-foreground">
                        {rx.id.slice(0, 8).toUpperCase()}
                      </span>
                      <StatusBadge status={rx.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getPatientName(rx.patientId, patients)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {rx.items.map(i => i.displayName).join(', ')}
                    </p>
                  </div>
                  <Link href={ROUTES.PRESCRIPTION(rx.id)}>
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
