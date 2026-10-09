import { keepPreviousData, queryOptions, type QueryClient } from "@tanstack/react-query";
import { getPatientById, getPatientsByIds } from "@/lib/api/patients";
import {
  LAB_REPORT_DOCUMENT, getLabInstruments, getLabOrderById, getLabOrderSummary, getLabOrdersByPatient, getLabOrdersPage,
  getLabResultsByOrder, getLabResultsByPatient, getLabStaff, getLabTestCatalog, getQCAlerts,
} from "@/lib/api/lab";
import { getOrderReports } from "@/lib/api/documents";
import type { LabOrder } from "@/types";

// Every query the portal makes, keyed so that one invalidation refreshes everything
// a write changes: ["orders", id] covers all of one order.

const newestFirst = (orders: LabOrder[]) => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Reference lists that change rarely, so they are kept for a few minutes. */
const CATALOG_STALE_MS = 5 * 60_000;

export const patientQueries = {
  all: ["patients"] as const,
  record: (patientId: string) => [...patientQueries.all, patientId] as const,

  /** Patients by id, as a lookup for lists that name them. Keeps the last lookup while one more name loads. */
  byIds: (ids: string[]) => queryOptions({
    queryKey: [...patientQueries.all, "by-ids", [...new Set(ids)].sort()],
    queryFn: () => getPatientsByIds(ids),
    placeholderData: keepPreviousData,
  }),
  detail: (patientId: string) => queryOptions({
    queryKey: patientQueries.record(patientId),
    queryFn: () => getPatientById(patientId),
  }),
  orders: (patientId: string) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "orders"],
    queryFn: () => getLabOrdersByPatient(patientId),
    select: newestFirst,
  }),
  results: (patientId: string) => queryOptions({
    queryKey: [...patientQueries.record(patientId), "results"],
    queryFn: () => getLabResultsByPatient(patientId),
  }),
};

export const orderQueries = {
  all: ["orders"] as const,
  record: (orderId: string) => [...orderQueries.all, orderId] as const,

  summary: () => queryOptions({
    queryKey: [...orderQueries.all, "summary"],
    queryFn: () => getLabOrderSummary(),
  }),
  page: (params: Parameters<typeof getLabOrdersPage>[0]) => queryOptions({
    queryKey: [...orderQueries.all, "page", params],
    queryFn: () => getLabOrdersPage(params),
  }),
  detail: (orderId: string) => queryOptions({
    queryKey: orderQueries.record(orderId),
    queryFn: () => getLabOrderById(orderId),
  }),
  results: (orderId: string) => queryOptions({
    queryKey: [...orderQueries.record(orderId), "results"],
    queryFn: () => getLabResultsByOrder(orderId),
  }),
  /** The order's report files, as the lab's analyser or a scan produced them. */
  reports: (orderId: string) => queryOptions({
    queryKey: [...orderQueries.record(orderId), "reports"],
    queryFn: () => getOrderReports(orderId),
    select: docs => docs.filter(d => d.type === LAB_REPORT_DOCUMENT),
  }),
};

export const labQueries = {
  catalog: () => queryOptions({
    queryKey: ["catalog"],
    queryFn: () => getLabTestCatalog(),
    staleTime: CATALOG_STALE_MS,
  }),
  instruments: () => queryOptions({
    queryKey: ["instruments"],
    queryFn: getLabInstruments,
  }),
  staff: () => queryOptions({
    queryKey: ["staff"],
    queryFn: getLabStaff,
    staleTime: CATALOG_STALE_MS,
  }),
  qcAlerts: (limit: number) => queryOptions({
    queryKey: ["qc", "alerts", limit],
    queryFn: () => getQCAlerts(limit),
  }),
};

/** After a lab writes to an order: the order, every list it is in, and its patient's record. */
export function invalidateOrder(client: QueryClient, order: Pick<LabOrder, "id" | "patientId">) {
  return Promise.all([
    client.invalidateQueries({ queryKey: orderQueries.all }),
    client.invalidateQueries({ queryKey: patientQueries.record(order.patientId) }),
  ]);
}
