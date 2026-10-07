"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { Appointment, Patient } from "@/types";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { AppointmentRow } from "@/components/features/visits/AppointmentRow";
import { CuroCalendar, formatDateStr, getRelativeDayLabel, type CalendarEvent, type CalendarEventColor } from "@curo/web/ui/curo-calendar";
import { getQueueGroup, type QueueGroup } from "@/lib/visit";

const GROUP_COLOR: Record<QueueGroup, CalendarEventColor> = {
  consultation: "blue",
  ready: "yellow",
  triage: "yellow",
  upcoming: "blue",
  done: "green",
};

interface Props {
  appointments: Appointment[];
  patients: Record<string, Patient>;
}

export function ScheduleClient({ appointments, patients }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const events: CalendarEvent[] = useMemo(
    () => appointments.map(a => ({
      id: a.id,
      date: a.date,
      title: patients[a.patientId]?.name.full ?? "Patient",
      subtitle: a.time,
      color: a.status === "cancelled" || a.status === "no_show" ? "gray" : GROUP_COLOR[getQueueGroup(a)],
    })),
    [appointments, patients],
  );

  const dateStr = formatDateStr(selectedDate);
  const daily = appointments.filter(a => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  const relative = getRelativeDayLabel(selectedDate);

  return (
    <div className="space-y-6">
      <PageHeader title="Schedule" description="Pick a day to see its appointments." />

      <CuroCalendar events={events} selectedDate={selectedDate} onDateSelect={setSelectedDate} maxEventsPerDay={3} />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {relative && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">{relative}</span>
            )}
          </h2>
          <span className="text-sm text-muted-foreground">{daily.length} {daily.length === 1 ? "visit" : "visits"}</span>
        </div>
        <Card className="gap-0 py-0">
          {daily.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No visits scheduled" />
          ) : (
            <div className="divide-y">
              {daily.map(a => <AppointmentRow key={a.id} appointment={a} patient={patients[a.patientId]} />)}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
