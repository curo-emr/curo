import { apiClient } from './client';
import type { Patient, Allergy, Problem } from '@/types';
import { mapFhirPatient, mapFhirAllergy, mapFhirCondition, type FhirPatient, type FhirAllergy, type FhirCondition } from './mappers';

export async function getPatients(search?: string): Promise<Patient[]> {
  const params = search ? { search } : {};
  const res = await apiClient.get<FhirPatient[]>('/patients', { params });
  return res.data.map(mapFhirPatient);
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
