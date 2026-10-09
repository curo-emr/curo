"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { PageHeader } from "@curo/web/ui/page-header";
import { BookAppointmentForm } from "@/components/features/appointments/BookAppointmentForm";
import { doctorQueries } from "@/lib/queries";

export default function NewAppointmentPage() {
  // A booking is with a doctor, so the form waits for them.
  const doctors = useQuery(doctorQueries.all());

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Book Appointment" description="Schedule a new patient appointment" />

      <QueryContent query={doctors} what="the doctors">
        {list => <BookAppointmentForm doctors={list} />}
      </QueryContent>
    </div>
  );
}
