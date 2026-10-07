import { apiClient } from "@curo/web/api";
import type { Payment } from "@/types";
import { unwrapBundle, type FhirBundle, type PaginatedResult } from "@curo/web/fhir";

export interface PaymentTotals {
  currency: string;
  total: number;
  count: number;
  /** Per receptionist, largest total first. */
  byCollector: { collectedBy: string | null; total: number; count: number }[];
}

// What receptionist-collected payments add up to: everyone's, or `collectedBy`'s.
export async function getPaymentTotals(collectedBy?: string): Promise<PaymentTotals> {
  const res = await apiClient.get<PaymentTotals>("/payments/totals", { params: { collectedBy } });
  return res.data;
}

// One page of the payments `collectedBy` took, latest first.
export async function getPaymentsPage(
  { page, pageSize, collectedBy }: { page: number; pageSize: number; collectedBy: string },
): Promise<PaginatedResult<Payment>> {
  const res = await apiClient.get<FhirBundle<Payment>>("/payments", { params: { page, pageSize, collectedBy } });
  const { resources, total } = unwrapBundle(res.data);
  return { items: resources, total, page, pageSize };
}

export async function correctPayment(
  id: string,
  input: { amount?: number; status?: string; notes?: string },
): Promise<Payment> {
  const res = await apiClient.put<Payment>(`/payments/${id}`, input);
  return res.data;
}
