import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Appointment, Patient, QueueStage } from "@/types";
import type { Practitioner } from "@/lib/api/practitioners";
import { patientQueries, practitionerQueries, queueQueries } from "@/lib/queries";
import { getTodayString } from "@/lib/utils";

export interface QueueEntry {
  appointment: Appointment;
  patient?: Patient;
  doctor?: Practitioner;
}

/**
 * Today's appointments in the given queue stages, joined with their patient and
 * doctor, refreshed while the page is open. A failed refresh keeps the last good data.
 */
export function useTodayQueue(stages: QueueStage[]) {
  const queue = useQuery(queueQueries.day(getTodayString(), stages));
  const appointments = queue.data;
  const patients = useQuery(patientQueries.byIds((appointments ?? []).map(a => a.patientId))).data;
  const doctors = useQuery(practitionerQueries.byRole("DOCTOR")).data;

  const entries = useMemo((): QueueEntry[] => {
    const patientById = new Map(patients?.map(p => [p.id, p]));
    const doctorById = new Map(doctors?.map(d => [d.id, d]));
    return (appointments ?? []).map(appointment => ({
      appointment,
      patient: patientById.get(appointment.patientId),
      doctor: doctorById.get(appointment.doctorId),
    }));
  }, [appointments, patients, doctors]);

  const status = appointments ? "ready" : queue.isError ? "error" : "loading";
  const updatedAt = queue.dataUpdatedAt ? new Date(queue.dataUpdatedAt) : null;
  return { entries, status, updatedAt, refresh: () => void queue.refetch() } as const;
}
