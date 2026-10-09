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
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Appointments" description="View and manage all patient appointments">
        <Link href={ROUTES.NEW_APPOINTMENT}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <CalendarPlus className="h-4 w-4 mr-2" />
            Book Appointment
          </Button>
        </Link>
      </PageHeader>

      <AppointmentList doctors={doctors} />
    </div>
  );
}
