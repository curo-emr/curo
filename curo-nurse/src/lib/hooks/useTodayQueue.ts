import { useCallback, useRef, useState } from "react";
import type { Appointment, Patient, QueueStage } from "@/types";
import { getQueue } from "@/lib/api/appointments";
import { getPatientsByIds } from "@/lib/api/patients";
import { getPractitioners, type Practitioner } from "@/lib/api/practitioners";
import { usePolling } from "./usePolling";
import { QUEUE_POLL_MS } from "@/lib/queue";
import { getTodayString } from "@/lib/utils";

export interface QueueEntry {
  appointment: Appointment;
  patient?: Patient;
  doctor?: Practitioner;
}

/**
 * Today's appointments in the given queue stages, joined with their patient and
 * doctor, refreshed every QUEUE_POLL_MS while the page is visible.
 */
export function useTodayQueue(stages: QueueStage[]) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const doctors = useRef<Map<string, Practitioner> | null>(null);
  const stageKey = stages.join(",");

  const refresh = useCallback(async () => {
    try {
      doctors.current ??= new Map((await getPractitioners("DOCTOR")).map(d => [d.id, d]));
      const appointments = await getQueue(getTodayString(), stageKey.split(",") as QueueStage[]);
      const patients = await getPatientsByIds([...new Set(appointments.map(a => a.patientId))]);
      const patientById = new Map(patients.map(p => [p.id, p]));
      setEntries(appointments.map(appointment => ({
        appointment,
        patient: patientById.get(appointment.patientId),
        doctor: doctors.current?.get(appointment.doctorId),
      })));
      setStatus("ready");
      setUpdatedAt(new Date());
    } catch (err) {
      console.error(err);
      // Keep showing the last good data if a background refresh fails.
      setStatus(current => (current === "ready" ? "ready" : "error"));
    }
  }, [stageKey]);

  usePolling(refresh, QUEUE_POLL_MS);

  return { entries, status, updatedAt, refresh };
}
