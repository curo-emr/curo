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

export interface TrendPoint {
  code: string;
  display: string;
  value: number;
  unit: string;
  effectiveDateTime: string;
}

// Multi-code, category-agnostic trend (BP + glucose + cholesterol, etc.)
export async function getObservationTrends(patientId: string, codes: string[]): Promise<TrendPoint[]> {
  const res = await apiClient.get<any[]>(`/vitals/patient/${patientId}/trends`, {
    params: { codes: codes.join(",") },
  });
  return (res.data ?? [])
    .map((o) => ({
      code: o?.code?.coding?.[0]?.code ?? "",
      display: o?.code?.coding?.[0]?.display ?? "",
      value: o?.valueQuantity?.value ?? null,
      unit: o?.valueQuantity?.unit ?? "",
      effectiveDateTime: o?.effectiveDateTime ?? "",
    }))
    .filter((p) => p.value != null && p.effectiveDateTime);
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
