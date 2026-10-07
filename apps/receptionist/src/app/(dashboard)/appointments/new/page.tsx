"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BookAppointmentForm } from "@/components/features/appointments/BookAppointmentForm";
import { PageHeader } from "@curo/web/ui/page-header";
import { getPatients } from "@/lib/api/patients";
import { getAppointments } from "@/lib/api/appointments";
import { getDoctors, type Practitioner } from "@/lib/api/practitioners";
import type { Patient, Doctor, Appointment } from "@/types";

function mapPractitionerToDoctor(p: Practitioner): Doctor {
  return {
    id: p.id, name: p.name, specialty: p.specialty,
    phone: p.phone, email: p.email, roomNumber: "",
    availableDays: [], slotDurationMinutes: 30,
    workingHours: { start: "08:00", end: "17:00" },
  };
}

export default function NewAppointmentPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPatients(), getDoctors(), getAppointments()])
      .then(([pts, practs, appts]) => {
        setPatients(pts);
        setDoctors(practs.map(mapPractitionerToDoctor));
        setAppointments(appts);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Book Appointment" description="Schedule a new patient appointment" />

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <BookAppointmentForm patients={patients} doctors={doctors} appointments={appointments} />
      )}
    </div>
  );
}
