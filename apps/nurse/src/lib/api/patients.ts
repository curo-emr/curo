import { apiClient, getByIds } from '@curo/web/api';
import type { Patient, Allergy, Problem } from '@/types';
import { mapFhirPatient, mapFhirAllergy, mapFhirCondition, type FhirPatient, type FhirAllergy, type FhirCondition } from './mappers';

// Resolve a specific set of patients (FHIR `_id` search) — e.g. the ones on today's queue.
export async function getPatientsByIds(ids: string[]): Promise<Patient[]> {
  return (await getByIds<FhirPatient>('/patients', ids)).map(mapFhirPatient);
}

export async function getPatientById(id: string): Promise<Patient> {
  const res = await apiClient.get<FhirPatient>(`/patients/${id}`);
  return mapFhirPatient(res.data);
}

export async function getAllergies(patientId: string): Promise<Allergy[]> {
  const res = await apiClient.get<FhirAllergy[]>(`/patients/${patientId}/allergies`);
  return res.data.map(a => mapFhirAllergy({ ...a, patient: { reference: `Patient/${patientId}` } }));
}

export async function getConditions(patientId: string): Promise<Problem[]> {
  const res = await apiClient.get<FhirCondition[]>(`/patients/${patientId}/conditions`);
  return res.data.map(c => mapFhirCondition({ ...c, subject: { reference: `Patient/${patientId}` } }));
}
