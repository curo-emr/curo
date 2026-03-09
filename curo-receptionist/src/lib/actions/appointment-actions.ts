"use server";

import {
  createAppointment,
  getAppointments,
  updateAppointment,
  createVisit,
  getVisits,
  updateVisit,
} from "@/lib/data/api";
import {
  bookAppointmentSchema,
  type BookAppointmentInput,
} from "@/lib/validations/appointment";
import { generateId } from "@/lib/utils";
import type { Appointment, Visit } from "@/types";

type AppointmentStatus = 'scheduled' | 'not_arrived' | 'arrived' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

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

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: AppointmentStatus
) {
  const allAppts = await getAppointments();
  const appt = allAppts.find((a) => a.id === appointmentId);
  if (!appt) {
    return { success: false, error: "Appointment not found" };
  }

  if (newStatus === "arrived") {
    const now = new Date().toISOString();
    const visitId = generateId("vis");
    const visit: Visit = {
      id: visitId,
      appointmentId: appt.id,
      patientId: appt.patientId,
      doctorId: appt.doctorId,
      date: appt.date,
      checkInTime: now,
      checkOutTime: null,
      status: "checked_in",
      notes: appt.reason,
      createdBy: "rec_8001",
    };
    await createVisit(visit);
    await updateAppointment({
      ...appt,
      status: "arrived",
      checkInTime: now,
      checkedInBy: "rec_8001",
      visitId,
    });
  } else if (newStatus === "in_progress") {
    await updateAppointment({ ...appt, status: "in_progress" });
    if (appt.visitId) {
      const allVisits = await getVisits();
      const visit = allVisits.find((v) => v.id === appt.visitId);
      if (visit) {
        await updateVisit({ ...visit, status: "with_doctor" });
      }
    }
  } else if (newStatus === "completed") {
    await updateAppointment({ ...appt, status: "completed" });
    if (appt.visitId) {
      const allVisits = await getVisits();
      const visit = allVisits.find((v) => v.id === appt.visitId);
      if (visit) {
        await updateVisit({
          ...visit,
          status: "completed",
          checkOutTime: new Date().toISOString(),
        });
      }
    }
  } else {
    await updateAppointment({ ...appt, status: newStatus });
  }

  return { success: true };
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
