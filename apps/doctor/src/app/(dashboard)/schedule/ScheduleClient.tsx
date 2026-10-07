"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { Appointment, Patient } from "@/types";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { AppointmentRow } from "@/components/features/visits/AppointmentRow";
import { CuroCalendar, calendarRange, formatDateStr, getRelativeDayLabel, type CalendarEvent, type CalendarEventColor } from "@curo/web/ui/curo-calendar";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { getAppointments } from "@/lib/api/appointments";
import { getPatientsByIds } from "@/lib/api/patients";
import { getQueueGroup, type QueueGroup } from "@/lib/visit";

const GROUP_COLOR: Record<QueueGroup, CalendarEventColor> = {
  consultation: "blue",
  ready: "yellow",
  triage: "yellow",
  upcoming: "blue",
  done: "green",
};

export function ScheduleClient() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(() => new Date());

  // The doctor's appointments on the month's grid, and their patients, loaded per month.
  const { from, to } = calendarRange(month);
  const [loaded, setLoaded] = useState<{ appointments: Appointment[]; patients: Record<string, Patient> }>();
  useEffect(() => {
    let current = true;
    getAppointments({ from, to })
      .then(async appointments => ({ appointments, patients: await getPatientsByIds(appointments.map(a => a.patientId)) }))
      .catch(() => ({ appointments: [], patients: {} }))
      .then(data => { if (current) setLoaded(data); });
    return () => { current = false; };
  }, [from, to]);
  const appointments = useMemo(() => loaded?.appointments ?? [], [loaded]);
  const patients = useMemo(() => loaded?.patients ?? {}, [loaded]);

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

  if (!loaded) return <PageSkeleton side={false} />;

  const dateStr = formatDateStr(selectedDate);
  const daily = appointments.filter(a => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  const relative = getRelativeDayLabel(selectedDate);

  return (
    <div className="space-y-6">
      <PageHeader title="Schedule" description="Pick a day to see its appointments." />

      <CuroCalendar events={events} selectedDate={selectedDate} onDateSelect={setSelectedDate} month={month} onMonthChange={setMonth} maxEventsPerDay={3} />

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
