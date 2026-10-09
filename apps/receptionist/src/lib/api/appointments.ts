import { apiClient, getAllPages } from '@curo/web/api';
import type { Appointment, QueueStage } from '@/types';
import { fhirAppointmentStatusesOf, mapFhirAppointment, type FhirAppointment } from './mappers';
import { unwrapBundle, type FhirBundle, type PaginatedResult } from '@curo/web/fhir';

/** A day's, a patient's or a range of days' appointments, so the set is bounded and read whole. */
type AppointmentFilters = {
  practitionerId?: string;
  queueStage?: string; // comma-separated QueueStage values
} & ({ date: string; patientId?: string } | { patientId: string } | { from: string; to: string });

export async function getAppointments(filters: AppointmentFilters): Promise<Appointment[]> {
  return (await getAllPages<FhirAppointment>('/appointments', filters)).map(mapFhirAppointment);
}

// One page of appointments, latest first.
export async function getAppointmentsPage({ page, pageSize, date, practitionerId, status }: {
  page: number;
  pageSize: number;
  date?: string;
  practitionerId?: string;
  status?: Appointment['status'];
}): Promise<PaginatedResult<Appointment>> {
  const statuses = status ? fhirAppointmentStatusesOf(status) : [];
  // No appointment is ever in a status that nothing maps to (in progress, for now).
  if (status && statuses.length === 0) return { items: [], total: 0, page, pageSize };
  const res = await apiClient.get<FhirBundle<FhirAppointment>>('/appointments', {
    params: { page, pageSize, date, practitionerId, status: statuses.join(',') || undefined, _sort: '-start' },
  });
  const { resources, total } = unwrapBundle(res.data);
  return { items: resources.map(mapFhirAppointment), total, page, pageSize };
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  return getAppointments({ date });
}

// A doctor's live appointments on a day (booked, arrived or seen; not cancelled or no-shows).
export async function getSchedule(practitionerId: string, date?: string): Promise<Appointment[]> {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  const res = await apiClient.get<{ queue: FhirAppointment[] }>(`/appointments/schedule/${practitionerId}`, { params });
  return res.data.queue.map(mapFhirAppointment);
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
