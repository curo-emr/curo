import { getAppointments, getPatients, getDoctors } from "@/lib/data/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { AppointmentList } from "@/components/features/appointments/AppointmentList";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";

export default async function AppointmentsPage() {
  const [appointments, patients, doctors] = await Promise.all([
    getAppointments(),
    getPatients(),
    getDoctors(),
  ]);

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

      <AppointmentList
        appointments={appointments}
        patients={patients}
        doctors={doctors}
      />
    </div>
  );
}
