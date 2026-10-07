import { apiClient } from './client';
import {
  mapFhirMedicationDispense,
  mapFhirMedicationRequest,
  type FhirMedicationDispense,
  type FhirMedicationRequest,
} from './mappers';
import { unwrapBundle, paginationParams, type FhirBundle, type PaginatedResult, type PaginationParams } from './fhir';
import type { Prescription } from '@/types';

// ─── Prescriptions ───────────────────────────────────────────────────────────

// Every active prescription (served by the clinical service, unpaginated).
export async function getPendingPrescriptions(): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[]>('/prescriptions/pending');
  return res.data.map(mapFhirMedicationRequest);
}

export async function getPrescription(id: string): Promise<Prescription> {
  const res = await apiClient.get<FhirMedicationRequest>(`/prescriptions/${id}`);
  return mapFhirMedicationRequest(res.data);
}

export async function getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[] | FhirBundle<FhirMedicationRequest>>('/prescriptions', { params: { patientId } });
  return unwrapBundle(res.data).resources.map(mapFhirMedicationRequest);
}

export interface PrescriptionSummary {
  /** Prescriptions awaiting dispense. */
  pendingCount: number;
  lastPrescribedAt: string | null;
}

// Prescription summaries for a page of patients in one request, keyed by patient id.
export async function getPrescriptionSummaries(patientIds: string[]): Promise<Map<string, PrescriptionSummary>> {
  const byPatient = new Map<string, PrescriptionSummary>(
    patientIds.map(id => [id, { pendingCount: 0, lastPrescribedAt: null }]),
  );
  if (patientIds.length === 0) return byPatient;
  const res = await apiClient.get<Array<PrescriptionSummary & { patientId: string }>>('/prescriptions/summary', {
    params: { patientIds: patientIds.join(',') },
  });
  for (const { patientId, ...summary } of res.data) byPatient.set(patientId, summary);
  return byPatient;
}

// ─── Dispense ────────────────────────────────────────────────────────────────

export interface DispenseRecord {
  id: string;
  prescriptionId: string;
  patientId: string;
  dispensedBy: string;
  dispensedAt: string;
  receiptNumber: string;
  totalAmount: number;
  items: Array<{
    medicationName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

// The server takes the patient, medication, quantity, price and dispenser from
// the prescription, stock and session.
export async function dispense(prescriptionId: string): Promise<DispenseRecord> {
  const res = await apiClient.post<FhirMedicationDispense>('/dispense', { medicationRequestId: prescriptionId });
  return mapFhirMedicationDispense(res.data);
}

type DispenseApi = FhirMedicationDispense | DispenseRecord;

export async function getDispensingRecords(): Promise<DispenseRecord[]> {
  const res = await apiClient.get<DispenseApi[] | FhirBundle<DispenseApi>>('/dispense', { params: { pageSize: 100 } });
  return unwrapBundle(res.data).resources.map(mapFhirMedicationDispense);
}

export async function getDispensingRecordsPaginated(params: PaginationParams = {}): Promise<PaginatedResult<DispenseRecord>> {
  const res = await apiClient.get<DispenseApi[] | FhirBundle<DispenseApi>>('/dispense', { params: paginationParams(params) });
  const { resources, total } = unwrapBundle(res.data);
  return { items: resources.map(mapFhirMedicationDispense), total, page: params.page ?? 1, pageSize: params.pageSize ?? 25 };
}

export async function getDispensingRecordsByPatient(patientId: string): Promise<DispenseRecord[]> {
  const res = await apiClient.get<DispenseApi[] | FhirBundle<DispenseApi>>('/dispense', { params: { patientId, pageSize: 100 } });
  return unwrapBundle(res.data).resources.map(mapFhirMedicationDispense);
}

export async function getDispensingRecordsByPrescription(prescriptionId: string): Promise<DispenseRecord[]> {
  const res = await apiClient.get<DispenseApi[] | FhirBundle<DispenseApi>>('/dispense', { params: { prescriptionId, pageSize: 100 } });
  return unwrapBundle(res.data).resources.map(mapFhirMedicationDispense);
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export interface StockItem {
  id: string;
  medicationName: string;
  genericName: string;
  brandName?: string;
  /** Optional when stock is received, so null for some batches. */
  form: string | null;
  strength: string;
  quantity: number;
  reorderThreshold: number;
  unitCost: number;
  expiryDate: string;
  batchNumber: string;
  supplier: string;
  location: string;
  isActive?: boolean;
}

export async function getStock(): Promise<StockItem[]> {
  const res = await apiClient.get<StockItem[] | FhirBundle<StockItem>>('/stock', { params: { pageSize: 100 } });
  return unwrapBundle(res.data).resources;
}

export async function getStockPaginated(params: PaginationParams = {}): Promise<PaginatedResult<StockItem>> {
  const res = await apiClient.get<StockItem[] | FhirBundle<StockItem>>('/stock', { params: paginationParams(params) });
  const { resources, total } = unwrapBundle(res.data);
  return { items: resources, total, page: params.page ?? 1, pageSize: params.pageSize ?? 25 };
}

export interface StockBatch {
  id: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  unitPrice: number;
  supplier: string;
  storageLocation: string;
}

export interface GroupedStock {
  medicationCode: string;
  medicationName: string;
  genericName: string;
  form: string;
  strength: string;
  unit: string;
  reorderThreshold: number;
  totalQuantity: number;
  batches: StockBatch[];
}

// Inventory grouped by drug, with each drug's batches (different expiry dates) FEFO-first.
export async function getGroupedStock(): Promise<GroupedStock[]> {
  const res = await apiClient.get<GroupedStock[]>('/stock/grouped');
  return res.data;
}

export async function getLowStockAlerts(): Promise<StockItem[]> {
  const res = await apiClient.get<StockItem[]>('/stock/alerts');
  return res.data;
}

export async function updateStock(id: string, data: Record<string, unknown>): Promise<StockItem> {
  const res = await apiClient.put<StockItem>(`/stock/${id}`, data);
  return res.data;
}

export async function createStock(data: Record<string, unknown>): Promise<StockItem> {
  const res = await apiClient.post<StockItem>('/stock', data);
  return res.data;
}
