"use client";

import { visitTypeLabel } from "@curo/web/appointments";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { cn } from "@curo/web/ui/utils";
import { useDoctorName } from "@/lib/hooks/useDirectory";
import { formatTime } from "@/lib/format";
import { APPOINTMENT_STATUS } from "@/lib/status";
import type { Appointment } from "@/types";

// One appointment: its date as a calendar tile, then the doctor and the time.
export function AppointmentRow({ appointment, muted }: { appointment: Appointment; muted?: boolean }) {
  const doctorName = useDoctorName();
  const { status, label } = APPOINTMENT_STATUS[appointment.status];
  const start = new Date(appointment.start);

  return (
    <li className="flex items-center gap-4 p-4">
      <div className={cn(
        "flex w-14 shrink-0 flex-col items-center rounded-lg py-1.5",
        muted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
      )}>
        <span className="text-[11px] font-medium uppercase">{start.toLocaleDateString("en-US", { month: "short" })}</span>
        <span className="text-xl font-semibold leading-none">{start.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{doctorName(appointment.doctorId)}</p>
        <p className="text-sm text-muted-foreground">
          {start.toLocaleDateString("en-US", { weekday: "short" })} · {formatTime(appointment.start)}
          {appointment.visitType && ` · ${visitTypeLabel(appointment.visitType)}`}
        </p>
      </div>
      <StatusBadge status={status} label={label} className="shrink-0" />
    </li>
  );
}
