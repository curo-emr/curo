"use server";

import {
  createAppointment,
  getAppointments,
  updateAppointment,
} from "@/lib/data/api";
import {
  bookAppointmentSchema,
  type BookAppointmentInput,
} from "@/lib/validations/appointment";
import { generateId } from "@/lib/utils";
import type { Appointment } from "@/types";

export async function bookNewAppointment(data: BookAppointmentInput) {
  const parsed = bookAppointmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const v = parsed.data;

  // Check for double-booking
  const allAppts = await getAppointments();
  const conflict = allAppts.find(
    (a) =>
      a.doctorId === v.doctorId &&
      a.date === v.date &&
      a.time === v.time &&
      a.status !== "cancelled"
  );

  if (conflict) {
    return {
      success: false,
      error: { time: ["This time slot is already booked"] },
    };
  }

  const appointment: Appointment = {
    id: generateId("apt"),
    date: v.date,
    time: v.time,
    doctorId: v.doctorId,
    patientId: v.patientId,
    reason: v.reason,
    visitType: v.visitType,
    status: "scheduled",
    room: "",
    notes: v.notes || "",
    checkInTime: null,
    checkedInBy: null,
    visitId: null,
  };

  // No-op in demo mode — data resets on reload
  await createAppointment(appointment);

  return { success: true, appointmentId: appointment.id };
}

export async function cancelAppointment(appointmentId: string) {
  const allAppts = await getAppointments();
  const appt = allAppts.find((a) => a.id === appointmentId);
  if (!appt) {
    return { success: false, error: "Appointment not found" };
  }

  // No-op in demo mode — data resets on reload
  await updateAppointment({ ...appt, status: "cancelled" });

  return { success: true };
}
