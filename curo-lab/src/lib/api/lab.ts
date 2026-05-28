import { apiClient } from './client';
import { mapFhirServiceRequest, type FhirServiceRequest } from './mappers';
import type { LabOrder } from '@/types';

// ─── Lab Orders ───────────────────────────────────────────────────────────────

export async function getLabOrders(params?: { status?: string; patientId?: string }): Promise<LabOrder[]> {
  const res = await apiClient.get<FhirServiceRequest[]>('/lab/orders', { params });
  return res.data.map(mapFhirServiceRequest);
}

export async function getLabOrderById(id: string): Promise<LabOrder | null> {
  try {
    const res = await apiClient.get<FhirServiceRequest>(`/lab/orders/${id}`);
    return mapFhirServiceRequest(res.data);
  } catch {
    return null;
  }
}

export async function getLabOrdersByPatient(patientId: string): Promise<LabOrder[]> {
  return getLabOrders({ patientId });
}

export async function receiveOrder(id: string): Promise<void> {
  await apiClient.put(`/lab/orders/${id}/receive`);
}

export async function scanQR(qrData: string): Promise<LabOrder> {
  const res = await apiClient.post<FhirServiceRequest>('/lab/orders/scan', { qrData });
  return mapFhirServiceRequest(res.data);
}

// ─── Results ─────────────────────────────────────────────────────────────────

export interface LabResultItem {
  testCode: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: 'normal' | 'high' | 'low' | 'critical';
}

export interface LabResult {
  id: string;
  orderId: string;
  patientId: string;
  performedAt: string;
  reportedAt?: string;
  results: LabResultItem[];
  conclusion?: string;
  status: string;
}

export async function enterResults(data: {
  orderId: string;
  results: LabResultItem[];
  conclusion?: string;
}): Promise<LabResult> {
  const res = await apiClient.post<LabResult>('/lab/results', data);
  return res.data;
}

export async function getLabResultsByOrder(orderId: string): Promise<LabResult[]> {
  const res = await apiClient.get<LabResult[]>('/lab/reports', { params: { orderId } });
  return res.data;
}

export async function getLabResultsByPatient(patientId: string): Promise<LabResult[]> {
  const res = await apiClient.get<LabResult[]>('/lab/reports', { params: { patientId } });
  return res.data;
}

// ─── Instruments ─────────────────────────────────────────────────────────────

export interface LabInstrument {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  status: string;
  lastCalibrated?: string;
  nextCalibrationDue?: string;
  location?: string;
}

export async function getLabInstruments(): Promise<LabInstrument[]> {
  const res = await apiClient.get<LabInstrument[]>('/lab/instruments');
  return res.data;
}

export async function updateInstrumentStatus(id: string, status: string): Promise<LabInstrument> {
  const res = await apiClient.put<LabInstrument>(`/lab/instruments/${id}/status`, { status });
  return res.data;
}
