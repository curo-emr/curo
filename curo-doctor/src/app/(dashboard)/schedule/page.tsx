"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ScheduleClient } from "./ScheduleClient";
import { getAppointments } from "@/lib/api/appointments";
import { getPatients } from "@/lib/api/patients";
import type { Appointment, Patient } from "@/types";

export default function SchedulePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAppointments(), getPatients()])
      .then(([appts, pts]) => {
        setAppointments(appts);
        setPatients(pts);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <ScheduleClient appointments={appointments} patients={patients} />;
}
