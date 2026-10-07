import { apiClient } from './client';
import {
  mapFhirDiagnosticReport,
  mapFhirServiceRequest,
  type FhirDiagnosticReport,
  type FhirServiceRequest,
} from './mappers';
import { unwrapBundle, paginationParams, type FhirBundle, type PaginatedResult, type PaginationParams } from './fhir';
import type { LabOrder } from '@/types';
import type { LabStaff, LabTestCatalogItem, QCLog, QCStatus, SpecimenType } from '@/types';
import { interpret, parseNumeric } from '@/lib/result-flag';

// ─── Lab Orders ───────────────────────────────────────────────────────────────

// Back-compat: returns up to 100 orders as a flat array (worklist computes status
// counts across the set). Unwraps either a bare array or a FHIR searchset Bundle.
export async function getLabOrders(params?: { status?: string; patientId?: string; encounterId?: string }): Promise<LabOrder[]> {
  const res = await apiClient.get<FhirServiceRequest[] | FhirBundle<FhirServiceRequest>>('/orders', {
    params: { pageSize: 100, ...params },
  });
  return unwrapBundle(res.data).resources.map(mapFhirServiceRequest);
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

/** What a scanned code turned out to be. */
export type ScanResult =
  /** A visit slip: the visit's tests sent to this lab (none when it sent us nothing). */
  | { kind: 'visit'; orders: LabOrder[] }
  /** A sample label: the sample is now received. */
  | { kind: 'sample'; order: LabOrder; testName: string };

/** Reads a scanned visit slip or sample label (the server tells which). */
export async function scanCode(qrData: string): Promise<ScanResult> {
  type Scanned = FhirServiceRequest & { scannedTest?: { display: string } | null };
  const res = await apiClient.post<Scanned | FhirBundle<FhirServiceRequest>>('/orders/scan', { qrData });
  if (res.data.resourceType === 'Bundle')
    return { kind: 'visit', orders: unwrapBundle(res.data).resources.map(mapFhirServiceRequest) };
  const order = mapFhirServiceRequest(res.data);
  return { kind: 'sample', order, testName: res.data.scannedTest?.display ?? order.tests.map(t => t.name).join(', ') };
}

/** The document type of a report file uploaded for an order; one completes the order without typed values. */
export const LAB_REPORT_DOCUMENT = 'lab-report';

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

/** One test's result as the technician typed it. */
export interface ResultEntry {
  code: string;
  display: string;
  value: string;
  unit: string;
  referenceRangeLow: string;
  referenceRangeHigh: string;
}

/** The API's result item: a number goes in `value`, anything else in `valueString`. */
function toResultItem(entry: ResultEntry) {
  const numeric = parseNumeric(entry.value);
  return {
    code: entry.code,
    display: entry.display,
    ...(numeric === null ? { valueString: entry.value.trim() } : { value: numeric }),
    unit: entry.unit.trim() || undefined,
    referenceRangeLow: entry.referenceRangeLow.trim() || undefined,
    referenceRangeHigh: entry.referenceRangeHigh.trim() || undefined,
    interpretation: interpret(entry.value, entry.referenceRangeLow, entry.referenceRangeHigh) ?? undefined,
  };
}

/** Files the order's results (typed, or none when a report file was uploaded) and completes it; the ordering doctor is notified. */
export async function enterResults(data: {
  orderId: string;
  results: ResultEntry[];
  conclusion?: string;
}): Promise<LabResult> {
  const res = await apiClient.post<FhirDiagnosticReport>('/results', {
    serviceRequestId: data.orderId,
    results: data.results.map(toResultItem),
    conclusion: data.conclusion?.trim() || undefined,
  });
  return mapFhirDiagnosticReport(res.data);
}

export async function getLabResultsByOrder(orderId: string): Promise<LabResult[]> {
  const res = await apiClient.get<FhirDiagnosticReport[] | FhirBundle<FhirDiagnosticReport>>('/reports', {
    params: { serviceRequestId: orderId },
  });
  return unwrapBundle(res.data).resources.map(mapFhirDiagnosticReport);
}

export async function getLabResultsByPatient(patientId: string): Promise<LabResult[]> {
  const res = await apiClient.get<FhirDiagnosticReport[] | FhirBundle<FhirDiagnosticReport>>('/reports', { params: { patientId, pageSize: 100 } });
  return unwrapBundle(res.data).resources.map(mapFhirDiagnosticReport);
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

function mapQcLog(log: ApiQCLog): QCLog {
  return {
    ...log,
    expectedValue: Number(log.expectedValue),
    observedValue: Number(log.observedValue),
  };
}

export async function getQCLogs(params?: { instrumentId?: string; status?: QCStatus }): Promise<QCLog[]> {
  const res = await apiClient.get<ApiQCLog[] | FhirBundle<ApiQCLog>>('/qc-logs', {
    params: { pageSize: 100, ...params },
  });
  return unwrapBundle(res.data).resources.map(mapQcLog);
}

// Server-driven pagination for the QC log table.
export async function getQCLogsPaginated(
  params: PaginationParams & { instrumentId?: string; status?: QCStatus } = {},
): Promise<PaginatedResult<QCLog>> {
  const { instrumentId, status, ...rest } = params;
  const res = await apiClient.get<ApiQCLog[] | FhirBundle<ApiQCLog>>('/qc-logs', {
    params: {
      ...paginationParams(rest),
      ...(instrumentId ? { instrumentId } : {}),
      ...(status ? { status } : {}),
    },
  });
  const { resources, total } = unwrapBundle(res.data);
  return {
    items: resources.map(mapQcLog),
    total,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 25,
  };
}

export async function getLabStaff(): Promise<LabStaff[]> {
  const res = await apiClient.get<LabStaff[]>('/lab-staff');
  return res.data;
}
