import type { Appointment, Patient } from "@/types";
import { calculateWaitTime } from "@/lib/utils";

// The front desk's view of the day: who is still to arrive, and how long the rest have waited.

/** A patient expected at the desk today, with the names to show. */
export interface Arrival {
  appointment: Appointment;
  /** Undefined until the patient lookup loads. */
  patient?: Patient;
  patientName: string;
  doctorName: string;
}

/** Cancelled or a no-show: neither here nor still expected. */
export const isMissed = (a: Appointment) => a.status === "cancelled" || a.status === "no_show";

/** Booked for the day but not checked in yet. */
export const isExpected = (a: Appointment) => a.status === "scheduled" || a.status === "not_arrived";

/** Minutes since the patient entered their current stage of the flow. */
export const minutesInStage = (a: Appointment) => (a.stageSince ? calculateWaitTime(a.stageSince) : 0);

/** Minutes past a same-day appointment's time ("HH:MM", local); 0 if it isn't due yet. */
export function minutesLate(time: string, now: Date = new Date()): number {
  const [hours, minutes] = time.split(":").map(Number);
  return Math.max(0, now.getHours() * 60 + now.getMinutes() - (hours * 60 + minutes));
}
