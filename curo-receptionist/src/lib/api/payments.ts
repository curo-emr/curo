import { apiClient } from "./client";

export interface Payment {
  id: string;
  patientId: string;
  appointmentId?: string;
  encounterId?: string;
  collectedBy?: string;
  type?: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  status?: string;
  receiptNumber?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
}

export interface IncomeSummary {
  currency: string;
  period: "day" | "week" | "month";
  total: number;
  count: number;
  buckets: { bucket: string; total: number; count: number }[];
}

export interface CreatePaymentInput {
  patientId: string;
  appointmentId?: string;
  encounterId?: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
}

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  const res = await apiClient.post<Payment>("/payments", input);
  return res.data;
}

export async function getMyPayments(from?: string, to?: string): Promise<Payment[]> {
  const res = await apiClient.get<Payment[]>("/payments/mine", {
    params: { from, to },
  });
  return res.data;
}

export async function getIncomeSummary(
  period: "day" | "week" | "month",
  from?: string,
  to?: string,
): Promise<IncomeSummary> {
  const res = await apiClient.get<IncomeSummary>("/payments/summary", {
    params: { period, from, to },
  });
  return res.data;
}

// A payment already recorded for an appointment cannot be edited — used to lock the UI.
export async function getPaymentForAppointment(appointmentId: string): Promise<Payment | null> {
  const res = await apiClient.get<Payment[]>("/payments/mine");
  return res.data.find((p) => p.appointmentId === appointmentId) ?? null;
}
