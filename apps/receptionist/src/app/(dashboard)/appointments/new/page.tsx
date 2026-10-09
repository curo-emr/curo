"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { PageHeader } from "@curo/web/ui/page-header";
import { BookAppointmentForm } from "@/components/features/appointments/BookAppointmentForm";
import { doctorQueries } from "@/lib/queries";
import { ROUTES } from "@/lib/constants";

export default function NewAppointmentPage() {
  // A booking is with a doctor, so the form waits for them.
  const doctors = useQuery(doctorQueries.all());

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Book an appointment"
        description="Pick the patient, the doctor and a free time."
        back={{ href: ROUTES.APPOINTMENTS, label: "All appointments" }}
      />

      <QueryContent query={doctors} what="the doctors">
        {list => <BookAppointmentForm doctors={list} />}
      </QueryContent>
    </div>
  );
}
