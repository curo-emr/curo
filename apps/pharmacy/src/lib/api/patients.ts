import { apiClient } from '@curo/web/api';
import type { Patient, Allergy, Problem } from '@/types';
import { mapFhirPatient, mapFhirAllergy, mapFhirCondition, type FhirPatient, type FhirAllergy, type FhirCondition } from './mappers';
import { unwrapBundle, paginationParams, type FhirBundle, type PaginatedResult, type PaginationParams } from '@curo/web/fhir';

// Backward-compatible: returns up to 100 patients as a flat array (used by
// dropdowns / lookups). Unwraps either a bare array or a FHIR searchset Bundle.
export async function getPatients(search?: string): Promise<Patient[]> {
  const res = await apiClient.get<FhirPatient[] | FhirBundle<FhirPatient>>('/patients', {
    params: { pageSize: 100, ...(search ? { search } : {}) },
  });
  return unwrapBundle(res.data).resources.map(mapFhirPatient);
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
  try {
    const res = await apiClient.get<FhirPatient>(`/patients/${id}`);
    return mapFhirPatient(res.data);
  } catch {
    return null;
  }
}

export async function getPatientByCode(code: string): Promise<Patient | null> {
  try {
    const res = await apiClient.get<FhirPatient>(`/patients/code/${code}`);
    return mapFhirPatient(res.data);
  } catch {
    return null;
  }
}

export async function getAllergies(patientId: string): Promise<Allergy[]> {
  const res = await apiClient.get<FhirAllergy[]>(`/patients/${patientId}/allergies`);
  return res.data.map(mapFhirAllergy);
}

// Allergies for a page of patients in one request, grouped by patient id.
export async function getAllergiesByPatient(patientIds: string[]): Promise<Map<string, Allergy[]>> {
  const byPatient = new Map<string, Allergy[]>(patientIds.map(id => [id, []]));
  if (patientIds.length === 0) return byPatient;
  const res = await apiClient.get<FhirAllergy[]>('/patients/allergies', {
    params: { patientIds: patientIds.join(',') },
  });
  for (const allergy of res.data.map(mapFhirAllergy)) {
    byPatient.get(allergy.patientId)?.push(allergy);
  }
  return byPatient;
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
