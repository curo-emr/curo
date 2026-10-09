import { apiClient, nullIfNotFound } from '@curo/web/api';
import { mapFhirPatient, mapFhirAllergy, mapFhirCondition, mapFhirMedicationRequest, mapFhirServiceRequest, mapFhirAppointment, mapFhirEncounter, type FhirPatient, type FhirAllergy, type FhirCondition, type FhirMedicationRequest, type FhirServiceRequest, type FhirAppointment, type FhirEncounter } from './mappers';
import type { Patient, Allergy, Problem, Appointment, Encounter, Prescription, LabOrder } from '@/types';
import { unwrapBundle, type FhirBundle } from '@curo/web/fhir';

/** The signed-in patient's record; null when their account has none. */
export async function getMyProfile(): Promise<Patient | null> {
  const res = await nullIfNotFound(apiClient.get<FhirPatient>('/patients/me'));
  return res && mapFhirPatient(res.data);
}

export async function getMyAppointments(): Promise<Appointment[]> {
  const res = await apiClient.get<FhirAppointment[] | FhirBundle<FhirAppointment>>('/appointments');
  return unwrapBundle(res.data).resources.map(mapFhirAppointment);
}

export async function getMyAllergies(patientId: string): Promise<Allergy[]> {
  const res = await apiClient.get<FhirAllergy[] | FhirBundle<FhirAllergy>>(`/patients/${patientId}/allergies`);
  return unwrapBundle(res.data).resources.map(a => mapFhirAllergy({ ...a, patient: { reference: `Patient/${patientId}` } }));
}

export async function getMyConditions(patientId: string): Promise<Problem[]> {
  const res = await apiClient.get<FhirCondition[] | FhirBundle<FhirCondition>>(`/patients/${patientId}/conditions`);
  return unwrapBundle(res.data).resources.map(c => mapFhirCondition({ ...c, subject: { reference: `Patient/${patientId}` } }));
}

export async function getMyPrescriptions(patientId: string): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[] | FhirBundle<FhirMedicationRequest>>('/prescriptions', { params: { patientId } });
  return unwrapBundle(res.data).resources.map(mapFhirMedicationRequest);
}

export async function getMyLabOrders(patientId: string): Promise<LabOrder[]> {
  const res = await apiClient.get<FhirServiceRequest[] | FhirBundle<FhirServiceRequest>>('/lab-orders', { params: { patientId } });
  return unwrapBundle(res.data).resources.map(mapFhirServiceRequest);
}

export async function getMyEncounters(patientId: string): Promise<Encounter[]> {
  const res = await apiClient.get<FhirEncounter[] | FhirBundle<FhirEncounter>>(`/encounters/patient/${patientId}`);
  return unwrapBundle(res.data).resources.map(mapFhirEncounter);
}

export interface Doctor {
  id: string;
  name: { full: string };
}

export async function getDoctors(): Promise<Doctor[]> {
  const res = await apiClient.get<Doctor[]>('/auth/practitioners', { params: { role: 'DOCTOR' } });
  return res.data.map(p => ({ id: p.id, name: { full: p.name.full } }));
}
