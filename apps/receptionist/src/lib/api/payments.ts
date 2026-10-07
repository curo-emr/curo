import { apiClient, getAllPages } from "@curo/web/api";
import { unwrapBundle, type FhirBundle, type PaginatedResult } from "@curo/web/fhir";

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

// One page of the payments you collected, latest first.
export async function getMyPaymentsPage(page: number, pageSize: number): Promise<PaginatedResult<Payment>> {
  const res = await apiClient.get<FhirBundle<Payment>>("/payments/mine", { params: { page, pageSize } });
  const { resources, total } = unwrapBundle(res.data);
  return { items: resources, total, page, pageSize };
}

// The payments you collected for these appointments.
export async function getMyPaymentsForAppointments(appointmentIds: string[]): Promise<Payment[]> {
  if (appointmentIds.length === 0) return [];
  return getAllPages<Payment>("/payments/mine", { appointmentId: appointmentIds.join(",") });
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
