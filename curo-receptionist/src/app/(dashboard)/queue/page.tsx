"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getTodayString } from "@/lib/utils";
import { QueueBoard } from "@/components/features/queue/QueueBoard";
import { PageHeader } from "@/components/ui/PageHeader";
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

export default function QueuePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const todayStr = getTodayString();

  useEffect(() => {
    Promise.all([
      getAppointments({ date: todayStr }),
      getPatients(),
      getDoctors(),
    ])
      .then(([appts, pts, practs]) => {
        setAppointments(appts);
        setPatients(pts);
        setDoctors(practs.map(mapPractitionerToDoctor));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [todayStr]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader title="Queue Board" description="Real-time patient waiting room and visit tracking" />

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <QueueBoard appointments={appointments} patients={patients} doctors={doctors} visits={[]} />
      )}
    </div>
  );
}
