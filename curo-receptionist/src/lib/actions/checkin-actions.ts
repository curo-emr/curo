import { updateAppointmentStatus } from "./appointment-actions";

export async function checkInPatient(appointmentId: string) {
  const result = await updateAppointmentStatus(appointmentId, "arrived");
  return { ...result, visitId: null };
}

export async function sendToDoctor(appointmentId: string) {
  return updateAppointmentStatus(appointmentId, "in_progress");
}

export async function completeVisit(appointmentId: string) {
  return updateAppointmentStatus(appointmentId, "completed");
}
