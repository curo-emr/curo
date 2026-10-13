import { apiClient, getAllPages, nullIfNotFound } from '@curo/web/api';
import { unwrapBundle, type FhirBundle } from '@curo/web/fhir';
import { getPractitioners } from '@curo/web/practitioners';
import type { Allergy, Appointment, Condition, LabReport, LabTest, Medicine, Named, Patient, Visit } from '@/types';
import {
  mapFhirAllergy, mapFhirAppointment, mapFhirCondition, mapFhirEncounter, mapFhirMedicationRequest, mapFhirPatient,
  mapFhirReport, mapFhirServiceRequest,
  type FhirAllergy, type FhirAppointment, type FhirCondition, type FhirDiagnosticReport, type FhirEncounter,
  type FhirMedicationRequest, type FhirPatient, type FhirServiceRequest,
} from './mappers';

// The signed-in patient's own record. The services limit a patient to their own,
// so a list asked for by patient id holds nobody else's.

type FhirList<T> = T[] | FhirBundle<T>;

const listOf = async <T>(path: string, params?: Record<string, string>) =>
  unwrapBundle((await apiClient.get<FhirList<T>>(path, { params })).data).resources;

const isDefined = <T>(x: T | undefined): x is T => x !== undefined;

/** The signed-in patient's record; null when their account has none. */
export async function getMyProfile(): Promise<Patient | null> {
  const res = await nullIfNotFound(apiClient.get<FhirPatient>('/patients/me'));
  return res && mapFhirPatient(res.data);
}

export async function getMyAppointments(): Promise<Appointment[]> {
  return (await getAllPages<FhirAppointment>('/appointments')).map(mapFhirAppointment);
}

export async function getMyAllergies(patientId: string): Promise<Allergy[]> {
  return (await listOf<FhirAllergy>(`/patients/${patientId}/allergies`)).map(mapFhirAllergy);
}

export async function getMyConditions(patientId: string): Promise<Condition[]> {
  return (await listOf<FhirCondition>(`/patients/${patientId}/conditions`)).map(mapFhirCondition);
}

/** Newest first. */
export async function getMyMedicines(patientId: string): Promise<Medicine[]> {
  return (await listOf<FhirMedicationRequest>('/prescriptions', { patientId })).map(mapFhirMedicationRequest).filter(isDefined);
}

/** Newest first. */
export async function getMyLabTests(patientId: string): Promise<LabTest[]> {
  return (await listOf<FhirServiceRequest>('/lab-orders', { patientId })).map(mapFhirServiceRequest).filter(isDefined);
}

export async function getMyLabReports(patientId: string): Promise<LabReport[]> {
  return (await getAllPages<FhirDiagnosticReport>('/reports', { patientId })).map(mapFhirReport);
}

/** Newest first. */
export async function getMyVisits(patientId: string): Promise<Visit[]> {
  return (await listOf<FhirEncounter>(`/encounters/patient/${patientId}`)).map(mapFhirEncounter);
}

export async function getDoctors(): Promise<Named[]> {
  return (await getPractitioners('DOCTOR')).map(p => ({ id: p.id, name: { full: `Dr. ${p.name.full}` } }));
}

/** Every pharmacy, closed ones too, to name the one a prescription went to. */
export async function getPharmacies(): Promise<Named[]> {
  const res = await apiClient.get<Array<{ id: string; name: string; phone?: string | null }>>('/organizations', {
    params: { type: 'pharmacy', includeInactive: true },
  });
  return res.data.map(o => ({ id: o.id, name: { full: o.name }, phone: o.phone ?? undefined }));
}
