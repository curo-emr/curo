import { apiClient, getAllPages } from '@curo/web/api';
import type { Appointment, QueueStage } from '@/types';
import { mapFhirAppointment, type FhirAppointment } from './mappers';

/** A day's, a patient's or a range of days' appointments, so the set is bounded and read whole. */
type AppointmentFilters = { practitionerId?: string } & (
  | { date: string; patientId?: string }
  | { patientId: string }
  | { from: string; to: string }
);

export async function getAppointments(filters: AppointmentFilters): Promise<Appointment[]> {
  return (await getAllPages<FhirAppointment>('/appointments', filters)).map(mapFhirAppointment);
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  return getAppointments({ date });
}

export async function updateAppointment(id: string, data: Record<string, unknown>): Promise<Appointment> {
  const res = await apiClient.put<FhirAppointment>(`/appointments/${id}`, data);
  return mapFhirAppointment(res.data);
}

// Move the patient through the day's flow; the backend validates the transition.
export async function updateQueueStage(id: string, stage: QueueStage): Promise<Appointment> {
  const res = await apiClient.put<FhirAppointment>(`/appointments/${id}/queue-stage`, { stage });
  return mapFhirAppointment(res.data);
}

export async function createAppointment(data: Record<string, unknown>): Promise<Appointment> {
  const res = await apiClient.post<FhirAppointment>('/appointments', data);
  return mapFhirAppointment(res.data);
}
