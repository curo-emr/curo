"use server";

import {
  getAppointments,
  updateAppointment,
  createVisit,
  getVisits,
  updateVisit,
} from "@/lib/data/api";
import { generateId } from "@/lib/utils";
import type { Visit } from "@/types";

export async function checkInPatient(appointmentId: string) {
  const allAppts = await getAppointments();
  const appt = allAppts.find((a) => a.id === appointmentId);
  if (!appt) {
    return { success: false, error: "Appointment not found" };
  }

  if (appt.status !== "scheduled" && appt.status !== "not_arrived") {
    return { success: false, error: "Patient cannot be checked in from current status" };
  }

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

  // No-ops in demo mode — data resets on reload
  await createVisit(visit);
  await updateAppointment({
    ...appt,
    status: "arrived",
    checkInTime: now,
    checkedInBy: "rec_8001",
    visitId,
  });

  return { success: true, visitId };
}

export async function sendToDoctor(appointmentId: string) {
  const allAppts = await getAppointments();
  const appt = allAppts.find((a) => a.id === appointmentId);
  if (!appt) {
    return { success: false, error: "Appointment not found" };
  }

  await updateAppointment({ ...appt, status: "in_progress" });

  if (appt.visitId) {
    const allVisits = await getVisits();
    const visit = allVisits.find((v) => v.id === appt.visitId);
    if (visit) {
      await updateVisit({ ...visit, status: "with_doctor" });
    }
  }

  return { success: true };
}

export async function completeVisit(appointmentId: string) {
  const allAppts = await getAppointments();
  const appt = allAppts.find((a) => a.id === appointmentId);
  if (!appt) {
    return { success: false, error: "Appointment not found" };
  }

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

  return { success: true };
}
