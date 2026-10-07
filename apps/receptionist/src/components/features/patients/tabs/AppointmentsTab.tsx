import { useMemo } from "react";
import Link from "next/link";
import { Appointment, Doctor } from "@/types";
import { ROUTES } from "@/lib/constants";
import { formatDate, formatTime, getDoctorName } from "@/lib/utils";
import { Button } from "@curo/web/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@curo/web/ui/table";
import { CalendarPlus, Calendar } from "lucide-react";

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
        description="This patient has no appointment records."
        actionLabel="Book New Appointment"
        actionHref={ROUTES.NEW_APPOINTMENT}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Link href={ROUTES.NEW_APPOINTMENT}>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <CalendarPlus className="h-4 w-4 mr-1.5" />
            Book New Appointment
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
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
                  {appt.visitType}
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
