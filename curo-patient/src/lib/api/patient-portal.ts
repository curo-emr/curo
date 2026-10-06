import { apiClient } from './client';
import { mapFhirPatient, mapFhirAllergy, mapFhirCondition, mapFhirMedicationRequest, mapFhirServiceRequest, mapFhirAppointment, mapFhirEncounter, type FhirPatient, type FhirAllergy, type FhirCondition, type FhirMedicationRequest, type FhirServiceRequest, type FhirAppointment, type FhirEncounter } from './mappers';
import type { Patient, Allergy, Problem, Appointment, Encounter, Prescription, LabOrder } from '@/types';
import { unwrapBundle, type FhirBundle } from './fhir';

export async function getMyProfile(): Promise<Patient | null> {
  try {
    const res = await apiClient.get<FhirPatient>('/patients/me');
    return mapFhirPatient(res.data);
  } catch {
    return null;
  }
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

export async function getPractitioners(): Promise<{ id: string; name: { full: string } }[]> {
  try {
    const res = await apiClient.get<Array<{ id: string; name: { full: string } }>>('/auth/practitioners?role=DOCTOR');
    return res.data.map(p => ({ id: p.id, name: { full: p.name.full } }));
  } catch {
    return [];
  }
}
