"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CalendarDays, History, Info } from "lucide-react";
import { QueryContent } from "@curo/web/query";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { AppointmentRow } from "@/components/features/AppointmentRow";
import { splitAppointments } from "@/lib/appointments";
import { RECEPTION } from "@/lib/constants";
import { myQueries } from "@/lib/queries";
import type { Appointment } from "@/types";

export default function AppointmentsPage() {
  const list = useQuery(myQueries.appointments());

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Appointments" description="Your appointments at the clinic." />
      <p className="flex items-start gap-2 rounded-lg border bg-background px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        To book, change or cancel an appointment, contact {RECEPTION}.
      </p>
      <QueryContent query={list} what="your appointments">
        {appointments => <Appointments appointments={appointments} />}
      </QueryContent>
    </div>
  );
}

function Appointments({ appointments }: { appointments: Appointment[] }) {
  const { upcoming, past } = splitAppointments(appointments);

  return (
    <>
      <SectionCard icon={CalendarDays} title="Coming up" count={upcoming.length} noPadding>
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No appointments coming up" />
        ) : (
          <ul className="divide-y">{upcoming.map(a => <AppointmentRow key={a.id} appointment={a} />)}</ul>
        )}
      </SectionCard>
      {past.length > 0 && (
        <SectionCard icon={History} iconClassName="text-muted-foreground" title="Past" count={past.length} noPadding>
          <ul className="divide-y">{past.map(a => <AppointmentRow key={a.id} appointment={a} muted />)}</ul>
        </SectionCard>
      )}
    </>
  );
}
