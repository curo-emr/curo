import { useMemo } from "react";
import { Appointment, Doctor } from "@/types";
import { formatDate, formatTime, getDoctorName } from "@/lib/utils";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { EmptyState } from "@curo/web/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@curo/web/ui/table";
import { Calendar } from "lucide-react";
import { visitTypeLabel } from "@curo/web/appointments";

interface AppointmentsTabProps {
  appointments: Appointment[];
  doctors: Doctor[];
}

export function AppointmentsTab({
  appointments,
  doctors,
}: AppointmentsTabProps) {
  const sorted = useMemo(() => {
    return [...appointments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [appointments]);

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No appointments"
        description="Book one with the button above the chart."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Visit Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((appt) => (
              <TableRow
                key={appt.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <TableCell className="text-foreground">
                  {formatDate(appt.date)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTime(appt.time)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getDoctorName(appt.doctorId, doctors)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {visitTypeLabel(appt.visitType)}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                  {appt.reason || "-"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={appt.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
