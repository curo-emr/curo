import { apiClient } from './client';
import { mapFhirPatient, mapFhirAllergy, mapFhirCondition, mapFhirMedicationRequest, mapFhirServiceRequest, mapFhirAppointment, type FhirPatient, type FhirAllergy, type FhirCondition, type FhirMedicationRequest, type FhirServiceRequest, type FhirAppointment } from './mappers';
import type { Patient, Allergy, Problem, Appointment, Prescription, LabOrder } from '@/types';

export async function getMyProfile(): Promise<Patient | null> {
  try {
    const res = await apiClient.get<FhirPatient>('/patients/me');
    return mapFhirPatient(res.data);
  } catch {
    return null;
  }
}

export async function getMyAppointments(): Promise<Appointment[]> {
  const res = await apiClient.get<FhirAppointment[]>('/appointments');
  return res.data.map(mapFhirAppointment);
}

export async function getMyAllergies(patientId: string): Promise<Allergy[]> {
  const res = await apiClient.get<FhirAllergy[]>(`/patients/${patientId}/allergies`);
  return res.data.map(a => mapFhirAllergy({ ...a, patient: { reference: `Patient/${patientId}` } }));
}

export async function getMyConditions(patientId: string): Promise<Problem[]> {
  const res = await apiClient.get<FhirCondition[]>(`/patients/${patientId}/conditions`);
  return res.data.map(c => mapFhirCondition({ ...c, subject: { reference: `Patient/${patientId}` } }));
}

export async function getMyPrescriptions(patientId: string): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[]>('/prescriptions', { params: { patientId } });
  return res.data.map(mapFhirMedicationRequest);
}

export async function getMyLabOrders(patientId: string): Promise<LabOrder[]> {
  const res = await apiClient.get<FhirServiceRequest[]>('/lab-orders', { params: { patientId } });
  return res.data.map(mapFhirServiceRequest);
}
