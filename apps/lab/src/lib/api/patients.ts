import { apiClient, getByIds, nullIfNotFound } from '@curo/web/api';
import type { Patient, Allergy, Problem } from '@/types';
import { mapFhirPatient, mapFhirAllergy, mapFhirCondition, type FhirPatient, type FhirAllergy, type FhirCondition } from './mappers';
import { unwrapBundle, paginationParams, type FhirBundle, type PaginatedResult, type PaginationParams } from '@curo/web/fhir';

// Resolve the patients a list shows (FHIR `_id` search).
export async function getPatientsByIds(ids: string[]): Promise<Patient[]> {
  return (await getByIds<FhirPatient>('/patients', ids)).map(mapFhirPatient);
}

// Server-driven pagination for the patient table.
export async function getPatientsPaginated(params: PaginationParams = {}): Promise<PaginatedResult<Patient>> {
  const res = await apiClient.get<FhirPatient[] | FhirBundle<FhirPatient>>('/patients', {
    params: paginationParams(params),
  });
  const { resources, total } = unwrapBundle(res.data);
  return {
    items: resources.map(mapFhirPatient),
    total,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 25,
  };
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const res = await nullIfNotFound(apiClient.get<FhirPatient>(`/patients/${id}`));
  return res && mapFhirPatient(res.data);
}

export async function getAllergies(patientId: string): Promise<Allergy[]> {
  const res = await apiClient.get<FhirAllergy[]>(`/patients/${patientId}/allergies`);
  return res.data.map(a => mapFhirAllergy({ ...a, patient: { reference: `Patient/${patientId}` } }));
}

export async function getConditions(patientId: string): Promise<Problem[]> {
  const res = await apiClient.get<FhirCondition[]>(`/patients/${patientId}/conditions`);
  return res.data.map(c => mapFhirCondition({ ...c, subject: { reference: `Patient/${patientId}` } }));
}

export async function createPatient(data: Record<string, unknown>): Promise<{ id: string; patientCode: string }> {
  const res = await apiClient.post<FhirPatient>('/patients', data);
  const patient = mapFhirPatient(res.data);
  return { id: patient.id, patientCode: patient.mrn };
}

export async function updatePatient(id: string, data: Record<string, unknown>): Promise<void> {
  await apiClient.patch(`/patients/${id}`, data);
}

export async function createAllergy(patientId: string, data: Record<string, unknown>): Promise<void> {
  await apiClient.post(`/patients/${patientId}/allergies`, data);
}
