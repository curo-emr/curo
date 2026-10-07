import { apiClient } from './client';
import type { Encounter } from '@/types';
import { mapFhirEncounter, type FhirEncounter } from './mappers';
import { unwrapBundle, type FhirBundle } from './fhir';

export async function getEncountersByPatient(patientId: string): Promise<Encounter[]> {
  const res = await apiClient.get<FhirEncounter[] | FhirBundle<FhirEncounter>>('/encounters', { params: { patientId } });
  return unwrapBundle(res.data).resources.map(mapFhirEncounter);
}

export async function getEncounterById(id: string): Promise<Encounter | null> {
  try {
    const res = await apiClient.get<FhirEncounter>(`/encounters/${id}`);
    return mapFhirEncounter(res.data);
  } catch {
    return null;
  }
}

// A signed visit, as the clinical service's POST /encounters/visit takes it.
export interface VisitPayload {
  id: string; // generated with the draft, so signing again can't record a second visit
  patientId: string;
  appointmentId?: string;
  reasonCode: string;
  note: { subjective?: string; objective?: string; assessment?: string; plan?: string; additionalNotes?: string };
  vitals: { code: string; display: string; valueQuantity: number; valueUnit: string }[];
  diagnoses: { code: string; display: string; isPrimary: boolean }[];
  prescriptions: {
    medicationCode: string;
    medicationDisplay: string;
    dosageText?: string;
    route?: string;
    frequency?: string;
    durationDays?: number;
    quantityValue?: number;
    note?: string;
  }[];
  labOrders: { code: string; display: string; priority: string; note?: string }[];
}

// Saves the whole visit in one transaction. Sending the same visit again returns the one already saved.
export async function completeVisit(visit: VisitPayload): Promise<Encounter> {
  const res = await apiClient.post<FhirEncounter>('/encounters/visit', visit);
  return mapFhirEncounter(res.data);
}
