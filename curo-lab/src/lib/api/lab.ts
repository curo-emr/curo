import { apiClient } from './client';
import {
  mapFhirDiagnosticReport,
  mapFhirServiceRequest,
  type FhirDiagnosticReport,
  type FhirServiceRequest,
} from './mappers';
import type { LabOrder } from '@/types';
import type { LabStaff, LabTestCatalogItem, QCLog, QCStatus, SpecimenType } from '@/types';

// ─── Lab Orders ───────────────────────────────────────────────────────────────

export async function getLabOrders(params?: { status?: string; patientId?: string }): Promise<LabOrder[]> {
  const res = await apiClient.get<FhirServiceRequest[]>('/orders', { params });
  return res.data.map(mapFhirServiceRequest);
}

export async function getLabOrderById(id: string): Promise<LabOrder | null> {
  try {
    const res = await apiClient.get<FhirServiceRequest>(`/orders/${id}`);
    return mapFhirServiceRequest(res.data);
  } catch {
    return null;
  }
}

export async function getLabOrdersByPatient(patientId: string): Promise<LabOrder[]> {
  return getLabOrders({ patientId });
}

// ─── Catalog ────────────────────────────────────────────────────────────────

interface ApiCatalogItem {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  specimen?: string | null;
  price?: number | string | null;
}

function mapSpecimenType(specimen?: string | null): SpecimenType {
  const normalized = specimen?.toLowerCase().replace(/\s+/g, '_') ?? '';
  if (normalized === 'whole_blood' || normalized === 'serum' || normalized === 'urine' || normalized === 'csf' || normalized === 'swab') {
    return normalized;
  }
  return 'other';
}

function mapCatalogItem(item: ApiCatalogItem): LabTestCatalogItem {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category ?? undefined,
    department: item.category ?? undefined,
    specimenType: mapSpecimenType(item.specimen),
    price: item.price == null ? undefined : Number(item.price),
    isPanel: false,
    components: [],
  };
}

export async function getLabTestCatalog(params?: { organizationId?: string }): Promise<LabTestCatalogItem[]> {
  const res = await apiClient.get<ApiCatalogItem[]>('/catalog', { params });
  return res.data.map(mapCatalogItem);
}

export async function receiveOrder(id: string): Promise<void> {
  await apiClient.put(`/orders/${id}/receive`);
}

export async function scanQR(qrData: string): Promise<LabOrder> {
  const res = await apiClient.post<FhirServiceRequest>('/orders/scan', { qrData });
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
  const res = await apiClient.post<FhirDiagnosticReport>('/results', {
    serviceRequestId: data.orderId,
    results: data.results.map(result => ({
      code: result.testCode,
      display: result.testName,
      valueString: result.value,
      unit: result.unit,
      referenceRangeText: result.referenceRange,
      interpretation: result.flag,
    })),
    conclusion: data.conclusion,
  });
  return mapFhirDiagnosticReport(res.data);
}

export async function getLabResultsByOrder(orderId: string, patientId?: string): Promise<LabResult[]> {
  const res = await apiClient.get<FhirDiagnosticReport[]>('/reports', { params: { patientId, orderId } });
  return res.data
    .map(mapFhirDiagnosticReport)
    .filter(report => report.orderId === orderId);
}

export async function getLabResultsByPatient(patientId: string): Promise<LabResult[]> {
  const res = await apiClient.get<FhirDiagnosticReport[]>('/reports', { params: { patientId } });
  return res.data.map(mapFhirDiagnosticReport);
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
  const res = await apiClient.get<LabInstrument[]>('/instruments');
  return res.data;
}

export async function updateInstrumentStatus(id: string, status: string): Promise<LabInstrument> {
  const res = await apiClient.put<LabInstrument>(`/instruments/${id}/status`, { status });
  return res.data;
}

// ─── Quality Control ────────────────────────────────────────────────────────

interface ApiQCLog extends Omit<QCLog, 'expectedValue' | 'observedValue'> {
  expectedValue: number | string;
  observedValue: number | string;
}

export async function getQCLogs(params?: { instrumentId?: string; status?: QCStatus }): Promise<QCLog[]> {
  const res = await apiClient.get<ApiQCLog[]>('/qc-logs', { params });
  return res.data.map(log => ({
    ...log,
    expectedValue: Number(log.expectedValue),
    observedValue: Number(log.observedValue),
  }));
}

export async function getLabStaff(): Promise<LabStaff[]> {
  const res = await apiClient.get<LabStaff[]>('/lab-staff');
  return res.data;
}
