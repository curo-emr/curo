import { apiClient, getAllPages, nullIfNotFound } from '@curo/web/api';
import {
  fhirPrioritiesOf,
  fhirStatusesOf,
  labOrderPriorityOf,
  labOrderStatusOf,
  mapFhirDiagnosticReport,
  mapFhirServiceRequest,
  type FhirDiagnosticReport,
  type FhirServiceRequest,
} from './mappers';
import { unwrapBundle, paginationParams, type FhirBundle, type PaginatedResult, type PaginationParams } from '@curo/web/fhir';
import type { LabOrder } from '@/types';
import type { LabStaff, LabTestCatalogItem, QCLog, QCStatus } from '@/types';
import type { ResultFlag } from '@curo/web/clinical';
import { interpret, parseNumeric } from '@/lib/result-flag';

// ─── Lab Orders ───────────────────────────────────────────────────────────────

// Every order from one visit, or for some patients.
export async function getLabOrders(filters: { encounterId: string } | { patientIds: string[] }): Promise<LabOrder[]> {
  if ('patientIds' in filters && filters.patientIds.length === 0) return [];
  const params = 'patientIds' in filters ? { patientId: filters.patientIds.join(',') } : filters;
  return (await getAllPages<FhirServiceRequest>('/orders', params)).map(mapFhirServiceRequest);
}

export interface LabOrderQuery {
  status?: LabOrder['status'];
  priorities?: LabOrder['priority'][];
  encounterId?: string;
  /** Matches the start of an order id, or any order for `searchPatientIds`. */
  search?: string;
  searchPatientIds?: string[];
  /** `priority`: stat, then urgent, then routine, newest first within each. */
  sort?: 'priority' | 'newest';
}

const ORDER_SORTS = { priority: 'priority', newest: '-authored' } as const;

// One page of the orders the lab can see.
export async function getLabOrdersPage(
  { page, pageSize, ...query }: LabOrderQuery & { page: number; pageSize: number },
): Promise<PaginatedResult<LabOrder>> {
  const statuses = query.status ? fhirStatusesOf(query.status) : [];
  // No order is ever in a status that nothing maps to (results_pending, for now).
  if (query.status && statuses.length === 0) return { items: [], total: 0, page, pageSize };
  const res = await apiClient.get<FhirBundle<FhirServiceRequest>>('/orders', {
    params: {
      page,
      pageSize,
      status: statuses.join(',') || undefined,
      priority: query.priorities?.flatMap(fhirPrioritiesOf).join(',') || undefined,
      encounterId: query.encounterId,
      search: query.search || undefined,
      searchPatientIds: query.searchPatientIds?.join(',') || undefined,
      _sort: query.sort && ORDER_SORTS[query.sort],
    },
  });
  const { resources, total } = unwrapBundle(res.data);
  return { items: resources.map(mapFhirServiceRequest), total, page, pageSize };
}

export interface LabOrderSummary {
  total: number;
  byStatus: Partial<Record<LabOrder['status'], number>>;
  byPriority: Partial<Record<LabOrder['priority'], number>>;
  /** The ten most-ordered tests, each test in a panel counted. */
  topTests: { code: string; display: string; count: number }[];
}

/** `counts` keyed by FHIR code, regrouped by what the lab sees each code as. */
function regroup<K extends string>(counts: Record<string, number>, keyOf: (code: string) => K) {
  const out: Partial<Record<K, number>> = {};
  for (const [code, count] of Object.entries(counts)) out[keyOf(code)] = (out[keyOf(code)] ?? 0) + count;
  return out;
}

// Counts across the lab's orders (one visit's, given `encounterId`).
export async function getLabOrderSummary(encounterId?: string): Promise<LabOrderSummary> {
  const res = await apiClient.get<{
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    topTests: LabOrderSummary['topTests'];
  }>('/orders/summary', { params: { encounterId } });
  const { byStatus, byPriority, topTests } = res.data;
  return {
    total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
    byStatus: regroup(byStatus, labOrderStatusOf),
    byPriority: regroup(byPriority, labOrderPriorityOf),
    topTests,
  };
}

/** Average minutes from sample received to results reported, over the lab's completed orders; null before any. */
export async function getTurnaround(): Promise<{ averageMinutes: number | null; count: number }> {
  const res = await apiClient.get<{ averageTatMinutes: number | null; count: number }>('/orders/tat');
  return { averageMinutes: res.data.averageTatMinutes, count: res.data.count };
}

export async function getLabOrderById(id: string): Promise<LabOrder | null> {
  const res = await nullIfNotFound(apiClient.get<FhirServiceRequest>(`/orders/${id}`));
  return res && mapFhirServiceRequest(res.data);
}

export async function getLabOrdersByPatient(patientId: string): Promise<LabOrder[]> {
  return getLabOrders({ patientIds: [patientId] });
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

function mapCatalogItem(item: ApiCatalogItem): LabTestCatalogItem {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category ?? undefined,
    specimen: item.specimen ?? undefined,
    price: item.price == null ? undefined : Number(item.price),
  };
}

/** The tests a lab offers (every lab's, with no `organizationId`). */
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
  flag?: ResultFlag;
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
  return (await getAllPages<FhirDiagnosticReport>('/reports', { patientId })).map(mapFhirDiagnosticReport);
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

// The first `limit` open QC alerts, newest first: controls whose latest run failed or
// warned. `total` counts them all.
export async function getQCAlerts(limit: number): Promise<{ items: QCLog[]; total: number }> {
  const res = await apiClient.get<FhirBundle<ApiQCLog>>('/qc-logs/alerts', { params: { pageSize: limit } });
  const { resources, total } = unwrapBundle(res.data);
  return { items: resources.map(mapQcLog), total };
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
