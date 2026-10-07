"use client";

import { useState, useEffect } from "react";
import { Loader2, CalendarPlus } from "lucide-react";
import { PageHeader } from "@curo/web/ui/page-header";
import { AppointmentList } from "@/components/features/appointments/AppointmentList";
import { Button } from "@curo/web/ui/button";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";
import { getAppointments } from "@/lib/api/appointments";
import { getPatients } from "@/lib/api/patients";
import { getDoctors, type Practitioner } from "@/lib/api/practitioners";
import type { Appointment, Patient, Doctor } from "@/types";

function mapPractitionerToDoctor(p: Practitioner): Doctor {
  return {
    id: p.id, name: p.name, specialty: p.specialty,
    phone: p.phone, email: p.email, roomNumber: "",
    availableDays: [], slotDurationMinutes: 30,
    workingHours: { start: "08:00", end: "17:00" },
  };
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAppointments(), getPatients(), getDoctors()])
      .then(([appts, pts, practs]) => {
        setAppointments(appts);
        setPatients(pts);
        setDoctors(practs.map(mapPractitionerToDoctor));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

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

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <AppointmentList appointments={appointments} patients={patients} doctors={doctors} />
      )}
    </div>
  );
}
