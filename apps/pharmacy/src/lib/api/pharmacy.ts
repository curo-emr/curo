import { apiClient, getAllPages, nullIfNotFound } from '@curo/web/api';
import {
  mapFhirMedicationDispense,
  mapFhirMedicationRequest,
  type FhirMedicationDispense,
  type FhirMedicationRequest,
} from './mappers';
import { unwrapBundle, type FhirBundle, type PaginatedResult } from '@curo/web/fhir';
import type { Prescription } from '@/types';

// ─── Prescriptions ───────────────────────────────────────────────────────────

// Every active prescription (served by the clinical service, unpaginated).
export async function getPendingPrescriptions(): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[]>('/prescriptions/pending');
  return res.data.map(mapFhirMedicationRequest);
}

export async function getPrescription(id: string): Promise<Prescription | null> {
  const res = await nullIfNotFound(apiClient.get<FhirMedicationRequest>(`/prescriptions/${id}`));
  return res && mapFhirMedicationRequest(res.data);
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

// One page of this pharmacy's dispenses, latest first. `search` matches the start of a
// prescription id or part of a medication name, or any dispense for `searchPatientIds`.
export async function getDispensingRecordsPage({ page, pageSize, search, searchPatientIds }: {
  page: number;
  pageSize: number;
  search?: string;
  searchPatientIds?: string[];
}): Promise<PaginatedResult<DispenseRecord>> {
  const res = await apiClient.get<FhirBundle<DispenseApi>>('/dispense', {
    params: { page, pageSize, search: search || undefined, searchPatientIds: searchPatientIds?.join(',') || undefined },
  });
  const { resources, total } = unwrapBundle(res.data);
  return { items: resources.map(mapFhirMedicationDispense), total, page, pageSize };
}

export interface DispenseSummary {
  count: number;
  revenue: number;
  /** The ten medications dispensed most, by units. */
  topMedications: { name: string; quantity: number }[];
}

// Counts this pharmacy's dispenses.
export async function getDispenseSummary(): Promise<DispenseSummary> {
  const res = await apiClient.get<DispenseSummary>('/dispense/summary');
  return res.data;
}

// A patient's or a prescription's dispenses come from every pharmacy, so their history is whole.
export async function getDispensingRecordsByPatient(patientId: string): Promise<DispenseRecord[]> {
  return (await getAllPages<DispenseApi>('/dispense', { patientId })).map(mapFhirMedicationDispense);
}

export async function getDispensingRecordsByPrescription(prescriptionId: string): Promise<DispenseRecord[]> {
  return (await getAllPages<DispenseApi>('/dispense', { prescriptionId })).map(mapFhirMedicationDispense);
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
  /** Optional when stock is received, so null for some drugs. */
  form: string | null;
  strength: string;
  unit: string;
  /** Units in batches that haven't expired. */
  usableQuantity: number;
  /** The drug is low at or below this many usable units. */
  reorderLevel: number;
  low: boolean;
  batches: StockBatch[];
}

// Inventory grouped by drug, with each drug's batches (different expiry dates) FEFO-first.
export async function getGroupedStock(): Promise<GroupedStock[]> {
  const res = await apiClient.get<GroupedStock[]>('/stock/grouped');
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
