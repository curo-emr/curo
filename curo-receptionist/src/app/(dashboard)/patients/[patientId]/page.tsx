"use client";

import { useState, useEffect, use } from "react";
import { Loader2 } from "lucide-react";
import { PatientHeader } from "@/components/features/patients/PatientHeader";
import { PatientChartTabs } from "@/components/features/patients/PatientChartTabs";
import { getPatientById, getAllergies } from "@/lib/api/patients";
import { getAppointments } from "@/lib/api/appointments";
import { getDoctors, type Practitioner } from "@/lib/api/practitioners";
import type { Patient, Allergy, Appointment, Doctor } from "@/types";

function mapPractitionerToDoctor(p: Practitioner): Doctor {
  return {
    id: p.id, name: p.name, specialty: p.specialty,
    phone: p.phone, email: p.email, roomNumber: "",
    availableDays: [], slotDurationMinutes: 30,
    workingHours: { start: "08:00", end: "17:00" },
  };
}

export default function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPatientById(patientId),
      getAllergies(patientId),
      getAppointments({ patientId }),
      getDoctors(),
    ])
      .then(([pt, alg, appts, practs]) => {
        setPatient(pt);
        setAllergies(alg);
        setAppointments(appts);
        setDoctors(practs.map(mapPractitionerToDoctor));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!patient) {
    return <div className="p-8 text-center text-slate-500">Patient not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PatientHeader patient={patient} allergies={allergies} />
      <PatientChartTabs
        patient={patient}
        allergies={allergies}
        appointments={appointments}
        visits={[]}
        doctors={doctors}
      />
    </div>
  );
}
