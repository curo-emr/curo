import { apiClient } from './client';
import type { Prescription, LabOrder } from '@/types';
import {
  mapFhirMedicationRequest, mapFhirServiceRequest,
  type FhirMedicationRequest, type FhirServiceRequest,
} from './mappers';

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function getNotesByEncounter(encounterId: string) {
  const res = await apiClient.get('/notes', { params: { encounterId } });
  return res.data;
}

export async function createNote(data: Record<string, unknown>) {
  const res = await apiClient.post('/notes', data);
  return res.data;
}

// ─── Vitals ──────────────────────────────────────────────────────────────────

export async function getVitalsByPatient(patientId: string) {
  const res = await apiClient.get('/vitals', { params: { patientId } });
  return res.data;
}

export async function getVitalsTrend(patientId: string) {
  const res = await apiClient.get(`/vitals/patient/${patientId}/trend`);
  return res.data;
}

export async function createVitals(data: Record<string, unknown>) {
  const res = await apiClient.post('/vitals', data);
  return res.data;
}

// ─── Prescriptions ───────────────────────────────────────────────────────────

export async function getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[]>('/prescriptions', { params: { patientId } });
  return res.data.map(mapFhirMedicationRequest);
}

export async function getPendingPrescriptions(): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[]>('/prescriptions/pending');
  return res.data.map(mapFhirMedicationRequest);
}

export async function createPrescription(data: Record<string, unknown>): Promise<Prescription> {
  const res = await apiClient.post<FhirMedicationRequest>('/prescriptions', data);
  return mapFhirMedicationRequest(res.data);
}

// ─── Lab Orders ──────────────────────────────────────────────────────────────

export async function getLabOrdersByPatient(patientId: string): Promise<LabOrder[]> {
  const res = await apiClient.get<FhirServiceRequest[]>('/lab-orders', { params: { patientId } });
  return res.data.map(mapFhirServiceRequest);
}

export async function getPendingLabOrders(): Promise<LabOrder[]> {
  const res = await apiClient.get<FhirServiceRequest[]>('/lab-orders', { params: { status: 'results_pending' } });
  return res.data.map(mapFhirServiceRequest);
}

export async function createLabOrder(data: Record<string, unknown>): Promise<LabOrder> {
  const res = await apiClient.post<FhirServiceRequest>('/lab-orders', data);
  return mapFhirServiceRequest(res.data);
}
