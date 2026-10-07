import { apiClient, apiErrorMessage } from "@curo/web/api";
import { mapFhirAppointment, type FhirAppointment } from "@/lib/api/mappers";
import { bookAppointmentSchema, type BookAppointmentInput } from "@/lib/validations/appointment";
import type { Appointment } from "@/types";

type AppointmentStatus = Appointment["status"];

export async function bookNewAppointment(data: BookAppointmentInput) {
  const parsed = bookAppointmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const v = parsed.data;

  // Build ISO datetime strings from date + time
  const [startHour, startMin] = v.time.split(":").map(Number);
  const startDt = new Date(v.date);
  startDt.setHours(startHour, startMin, 0, 0);
  const endDt = new Date(startDt.getTime() + 30 * 60 * 1000); // 30 min slot

  const payload = {
    patientId: v.patientId,
    practitionerId: v.doctorId,
    start: startDt.toISOString(),
    end: endDt.toISOString(),
    reasonCode: v.reason,
    serviceType: v.visitType,
    comment: v.notes || undefined,
  };

  try {
    const res = await apiClient.post<FhirAppointment>("/appointments", payload);
    const appt = mapFhirAppointment(res.data);
    return { success: true, appointmentId: appt.id };
  } catch (err) {
    const msg = apiErrorMessage(err, "Failed to book appointment");
    return { success: false, error: { _form: [msg] } };
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus
) {
  // Map frontend status to FHIR status
  const statusMap: Record<AppointmentStatus, string> = {
    scheduled: "booked",
    not_arrived: "booked",
    arrived: "arrived",
    waiting: "waitlist",
    in_progress: "arrived",
    completed: "fulfilled",
    cancelled: "cancelled",
    no_show: "noshow",
  };

  try {
    await apiClient.put(`/appointments/${appointmentId}`, {
      status: statusMap[newStatus] ?? newStatus,
    });
    return { success: true };
  } catch (err) {
    const msg = apiErrorMessage(err, "Failed to update appointment");
    return { success: false, error: msg };
  }
}

export async function cancelAppointment(appointmentId: string) {
  return updateAppointmentStatus(appointmentId, "cancelled");
}
