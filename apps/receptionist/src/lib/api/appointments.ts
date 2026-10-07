import { apiClient, getAllPages } from '@curo/web/api';
import type { Appointment, QueueStage } from '@/types';
import { mapFhirAppointment, type FhirAppointment } from './mappers';
import { unwrapBundle, type FhirBundle } from '@curo/web/fhir';

/** A day's or a patient's appointments, so the set is bounded and read whole. */
type AppointmentFilters = {
  practitionerId?: string;
  queueStage?: string; // comma-separated QueueStage values
} & ({ date: string; patientId?: string } | { patientId: string });

export async function getAppointments(filters: AppointmentFilters): Promise<Appointment[]> {
  return (await getAllPages<FhirAppointment>('/appointments', filters)).map(mapFhirAppointment);
}

// Only the first 100 appointments, oldest first. The pages that list every
// appointment still use this until they ask for a date range or page on the
// server (plan/03 B2).
export async function getAppointmentsFirstPage(): Promise<Appointment[]> {
  const res = await apiClient.get<FhirAppointment[] | FhirBundle<FhirAppointment>>('/appointments', {
    params: { pageSize: 100 },
  });
  return unwrapBundle(res.data).resources.map(mapFhirAppointment);
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  return getAppointments({ date });
}

export async function getSchedule(practitionerId: string, date?: string): Promise<Appointment[]> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await apiClient.get<FhirAppointment[]>(`/appointments/schedule/${practitionerId}`, { params });
  return res.data.map(mapFhirAppointment);
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
