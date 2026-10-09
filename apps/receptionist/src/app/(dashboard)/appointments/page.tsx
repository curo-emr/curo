"use client";

import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { PageHeader } from "@curo/web/ui/page-header";
import { Button } from "@curo/web/ui/button";
import { AppointmentList } from "@/components/features/appointments/AppointmentList";
import { ROUTES } from "@/lib/constants";
import { useDoctors } from "@/lib/hooks/useDoctors";

export default function AppointmentsPage() {
  const doctors = useDoctors();

  return (
    <div className="space-y-6">
      <PageHeader title="Appointments" description="Every booking, filtered by day, doctor or status. Change a status or take a payment from its row.">
        <Button asChild>
          <Link href={ROUTES.NEW_APPOINTMENT}>
            <CalendarPlus /> Book appointment
          </Link>
        </Button>
      </PageHeader>

      <AppointmentList doctors={doctors} />
    </div>
  );
}
