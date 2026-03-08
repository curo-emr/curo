import { getPatients, getDoctors, getAppointments } from "@/lib/data/api";
import { BookAppointmentForm } from "@/components/features/appointments/BookAppointmentForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function NewAppointmentPage() {
  const [patients, doctors, appointments] = await Promise.all([
    getPatients(),
    getDoctors(),
    getAppointments(),
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Book Appointment"
        description="Schedule a new patient appointment"
      />

      <BookAppointmentForm
        patients={patients}
        doctors={doctors}
        appointments={appointments}
      />
    </div>
  );
}
