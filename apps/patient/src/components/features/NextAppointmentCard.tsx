"use client";

import { CalendarCheck, Clock, Stethoscope } from "lucide-react";
import { visitTypeLabel } from "@curo/web/appointments";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { RECEPTION } from "@/lib/constants";
import { dayOf, formatDay, formatTime } from "@/lib/format";
import { useDoctorName } from "@/lib/hooks/useDirectory";
import { getTodayString } from "@curo/web/format";
import type { Appointment } from "@/types";

/** "Today", "Tomorrow" or the weekday and date. */
function whenOf(iso: string): string {
  const day = dayOf(iso);
  const today = new Date();
  if (day === getTodayString(today)) return "Today";
  today.setDate(today.getDate() + 1);
  return day === getTodayString(today) ? "Tomorrow" : formatDay(iso);
}

// The patient's next appointment, the first thing they come to check.
export function NextAppointmentCard({ appointment }: { appointment?: Appointment }) {
  const doctorName = useDoctorName();

  if (!appointment) {
    return (
      <Card>
        <EmptyState
          icon={CalendarCheck}
          title="No appointments coming up"
          description={`To book one, contact ${RECEPTION}.`}
          className="py-8"
        />
      </Card>
    );
  }

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card">
      <div className="flex flex-col gap-1.5 p-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Your next appointment</span>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{whenOf(appointment.start)}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {formatTime(appointment.start)}</span>
          <span className="inline-flex items-center gap-1.5"><Stethoscope className="size-4" /> {doctorName(appointment.doctorId)}</span>
          {appointment.visitType && <span>{visitTypeLabel(appointment.visitType)}</span>}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Can&apos;t make it? Contact {RECEPTION} to change it.</p>
      </div>
    </Card>
  );
}
