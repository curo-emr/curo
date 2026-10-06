import { apiClient } from './client';
import type { Appointment, QueueStage } from '@/types';
import { mapFhirAppointment, type FhirAppointment } from './mappers';
import { unwrapBundle, type FhirBundle } from './fhir';

// One day's appointments in the given queue stages (ordered by start time).
export async function getQueue(date: string, stages: QueueStage[]): Promise<Appointment[]> {
  const res = await apiClient.get<FhirAppointment[] | FhirBundle<FhirAppointment>>('/appointments', {
    params: { date, queueStage: stages.join(','), pageSize: 100 },
  });
  return unwrapBundle(res.data).resources.map(mapFhirAppointment);
}

export async function getAppointmentById(id: string): Promise<Appointment> {
  const res = await apiClient.get<FhirAppointment>(`/appointments/${id}`);
  return mapFhirAppointment(res.data);
}

// Move the patient through the day's flow; the backend validates the transition.
export async function updateQueueStage(id: string, stage: QueueStage): Promise<Appointment> {
  const res = await apiClient.put<FhirAppointment>(`/appointments/${id}/queue-stage`, { stage });
  return mapFhirAppointment(res.data);
}
