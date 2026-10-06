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

export async function getPendingPrescriptions(): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[] | FhirBundle<FhirMedicationRequest>>('/prescriptions/pending', {
    params: { pageSize: 100 },
  });
  return unwrapBundle(res.data).resources.map(mapFhirMedicationRequest);
}

export async function getPendingPrescriptionsPaginated(params: PaginationParams = {}): Promise<PaginatedResult<Prescription>> {
  const res = await apiClient.get<FhirMedicationRequest[] | FhirBundle<FhirMedicationRequest>>('/prescriptions/pending', {
    params: paginationParams(params),
  });
  const { resources, total } = unwrapBundle(res.data);
  return { items: resources.map(mapFhirMedicationRequest), total, page: params.page ?? 1, pageSize: params.pageSize ?? 25 };
}

export async function getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[] | FhirBundle<FhirMedicationRequest>>('/prescriptions', { params: { patientId } });
  return unwrapBundle(res.data).resources.map(mapFhirMedicationRequest);
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

export async function dispense(prescriptionId: string): Promise<DispenseRecord> {
  const res = await apiClient.post<FhirMedicationDispense>('/dispense', { prescriptionId });
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
  return unwrapBundle(res.data).resources
    .map(mapFhirMedicationDispense)
    .filter(record => record.prescriptionId === prescriptionId);
}

// ─── Stock ───────────────────────────────────────────────────────────────────

export interface StockItem {
  id: string;
  medicationName: string;
  genericName: string;
  brandName?: string;
  form: string;
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
