import { useMemo } from "react";
import { Visit, Doctor } from "@/types";
import { formatDate, getDoctorName } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

interface VisitHistoryTabProps {
  visits: Visit[];
  doctors: Doctor[];
}

export function VisitHistoryTab({ visits, doctors }: VisitHistoryTabProps) {
  const sorted = useMemo(() => {
    return [...visits].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [visits]);

  if (visits.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No visit history"
        description="This patient has no recorded visits yet."
      />
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((visit) => (
        <Card
          key={visit.id}
          className="shadow-sm border hover:border-muted-foreground transition-colors"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">
                    {formatDate(visit.date)}
                  </span>
                  <StatusBadge status={visit.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Doctor: {getDoctorName(visit.doctorId, doctors)}
                </p>
                {visit.notes && (
                  <p className="text-sm text-muted-foreground mt-1">{visit.notes}</p>
                )}
              </div>
              <div className="text-xs text-muted-foreground shrink-0">
                {visit.checkInTime && (
                  <span>Check-in: {visit.checkInTime}</span>
                )}
                {visit.checkOutTime && (
                  <span className="ml-3">
                    Check-out: {visit.checkOutTime}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
