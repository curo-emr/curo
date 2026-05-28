import { apiClient } from './client';
import type { Encounter } from '@/types';
import { mapFhirEncounter, type FhirEncounter } from './mappers';

export async function getEncountersByPatient(patientId: string): Promise<Encounter[]> {
  const res = await apiClient.get<FhirEncounter[]>('/encounters', { params: { patientId } });
  return res.data.map(mapFhirEncounter);
}

export async function getEncounterById(id: string): Promise<Encounter | null> {
  try {
    const res = await apiClient.get<FhirEncounter>(`/encounters/${id}`);
    return mapFhirEncounter(res.data);
  } catch {
    return null;
  }
}

export async function createEncounter(data: Record<string, unknown>): Promise<Encounter> {
  const res = await apiClient.post<FhirEncounter>('/encounters', data);
  return mapFhirEncounter(res.data);
}

export async function updateEncounterStatus(id: string, status: string): Promise<void> {
  await apiClient.put(`/encounters/${id}/status`, { status });
}
