import { apiClient } from "@curo/web/api";
import type { Payment } from "@/types";
import { unwrapBundle, type FhirBundle } from "@curo/web/fhir";

// Admin oversight of receptionist-collected income.
export async function getAllPayments(filters?: {
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
