import { apiClient } from "./client";
import type { Payment } from "@/types";

// Admin oversight of receptionist-collected income.
export async function getAllPayments(filters?: {
  collectedBy?: string;
  patientId?: string;
  from?: string;
  to?: string;
}): Promise<Payment[]> {
  const res = await apiClient.get<Payment[]>("/payments", { params: filters });
  return res.data;
}

export async function correctPayment(
  id: string,
  input: { amount?: number; status?: string; notes?: string },
): Promise<Payment> {
  const res = await apiClient.put<Payment>(`/payments/${id}`, input);
  return res.data;
}
