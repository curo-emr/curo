import { getTodayString } from "@curo/web/format";
import { dayOf } from "@/lib/format";
import type { Appointment } from "@/types";

/** Appointments still to come (soonest first) and the rest (latest first). */
export function splitAppointments(appointments: Appointment[]) {
  const today = getTodayString();
  const isUpcoming = (a: Appointment) =>
    (a.status === "scheduled" || a.status === "arrived") && dayOf(a.start) >= today;
  const byStart = (a: Appointment, b: Appointment) => a.start.localeCompare(b.start);
  return {
    upcoming: appointments.filter(isUpcoming).sort(byStart),
    past: appointments.filter(a => !isUpcoming(a)).sort((a, b) => byStart(b, a)),
  };
}
