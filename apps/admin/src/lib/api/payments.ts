import { apiClient } from "@curo/web/api";
import type { Payment } from "@/types";
import { unwrapBundle, type FhirBundle } from "@curo/web/fhir";

// Admin oversight of receptionist-collected income: the latest 100 payments,
// newest first. The overview, income and user pages still total these until they
// ask for a date range or the server sums them (plan/03 B2).
export async function getRecentPayments(filters?: {
  collectedBy?: string;
  patientId?: string;
  from?: string;
  to?: string;
}): Promise<Payment[]> {
  const res = await apiClient.get<Payment[] | FhirBundle<Payment>>("/payments", {
    params: { pageSize: 100, ...filters },
  });
  return unwrapBundle(res.data).resources;
}

export async function correctPayment(
  id: string,
  input: { amount?: number; status?: string; notes?: string },
): Promise<Payment> {
  const res = await apiClient.put<Payment>(`/payments/${id}`, input);
  return res.data;
}
