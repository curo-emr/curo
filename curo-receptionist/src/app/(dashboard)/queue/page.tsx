"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getTodayString } from "@/lib/utils";
import { QueueBoard } from "@/components/features/queue/QueueBoard";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAppointments } from "@/lib/api/appointments";
import { getPatientsByIds } from "@/lib/api/patients";
import { getDoctors, type Practitioner } from "@/lib/api/practitioners";
import { usePolling } from "@/lib/hooks/usePolling";
import { QUEUE_POLL_MS, QUEUE_STAGES } from "@/lib/queue";
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

  useEffect(() => {
    getDoctors().then((practs) => setDoctors(practs.map(mapPractitionerToDoctor))).catch(console.error);
  }, []);

  // Today's checked-in patients, refreshed while the board is open.
  const loadQueue = async () => {
    try {
      const appts = await getAppointments({ date: getTodayString(), queueStage: QUEUE_STAGES.join(",") });
      const pts = await getPatientsByIds([...new Set(appts.map((a) => a.patientId))]);
      setAppointments(appts);
      setPatients(pts);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  usePolling(loadQueue, QUEUE_POLL_MS);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Queue Board"
        description="Today's patient flow — from check-in through nurse triage to the doctor. Updates automatically."
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <QueueBoard appointments={appointments} patients={patients} doctors={doctors} onChange={loadQueue} />
      )}
    </div>
  );
}
