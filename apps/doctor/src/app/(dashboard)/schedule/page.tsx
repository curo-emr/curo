"use client";

import { useState, useEffect } from "react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { ScheduleClient } from "./ScheduleClient";
import { getAppointmentsFirstPage } from "@/lib/api/appointments";
import { getPatientsByIds } from "@/lib/api/patients";
import type { Appointment, Patient } from "@/types";

export default function SchedulePage() {
  const [data, setData] = useState<{ appointments: Appointment[]; patients: Record<string, Patient> } | null>(null);

  useEffect(() => {
    getAppointmentsFirstPage()
      .then(async appointments => ({ appointments, patients: await getPatientsByIds(appointments.map(a => a.patientId)) }))
      .then(setData)
      .catch(() => setData({ appointments: [], patients: {} }));
  }, []);

  if (!data) return <PageSkeleton side={false} />;
  return <ScheduleClient appointments={data.appointments} patients={data.patients} />;
}
