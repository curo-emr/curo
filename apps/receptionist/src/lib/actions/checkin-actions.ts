import { updateAppointmentStatus } from "./appointment-actions";
import { updateQueueStage } from "@/lib/api/appointments";
import { apiErrorMessage } from "@/lib/api/client";

// Check-in: the backend automatically queues the patient for nurse triage.
export async function checkInPatient(appointmentId: string) {
  return updateAppointmentStatus(appointmentId, "arrived");
}

// Bypass nurse triage: queue the patient straight for the doctor, then make sure
// they are checked in (a no-op for patients who already are).
export async function sendToDoctor(appointmentId: string) {
  try {
    await updateQueueStage(appointmentId, "ready_for_doctor");
  } catch (err) {
    return { success: false, error: apiErrorMessage(err, "Failed to send patient to doctor") };
  }
  return updateAppointmentStatus(appointmentId, "arrived");
}

export async function completeVisit(appointmentId: string) {
  return updateAppointmentStatus(appointmentId, "completed");
}
