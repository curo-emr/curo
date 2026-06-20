import { apiClient } from './client';
import { mapFhirPatient, mapFhirMedicationRequest, type FhirPatient, type FhirMedicationRequest } from './mappers';
import type { Patient, Prescription } from '@/types';

// ─── Prescriptions ───────────────────────────────────────────────────────────

export async function getPendingPrescriptions(): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[]>('/prescriptions/pending');
  return res.data.map(mapFhirMedicationRequest);
}

export async function getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[]>('/prescriptions', { params: { patientId } });
  return res.data.map(mapFhirMedicationRequest);
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
  const res = await apiClient.post<DispenseRecord>('/dispense', { prescriptionId });
  return res.data;
}

export async function getDispensingRecords(): Promise<DispenseRecord[]> {
  const res = await apiClient.get<DispenseRecord[]>('/dispense');
  return res.data;
}

export async function getDispensingRecordsByPatient(patientId: string): Promise<DispenseRecord[]> {
  const res = await apiClient.get<DispenseRecord[]>('/dispense', { params: { patientId } });
  return res.data;
}

export async function getDispensingRecordsByPrescription(prescriptionId: string): Promise<DispenseRecord[]> {
  const res = await apiClient.get<DispenseRecord[]>('/dispense', { params: { prescriptionId } });
  return res.data;
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
  const res = await apiClient.get<StockItem[]>('/stock');
  return res.data;
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
