import { apiClient } from "./client";
import type { AuditEntry } from "@/types";

export async function getAuditLogs(filters?: {
  userId?: string;
  resourceType?: string;
  from?: string;
  to?: string;
}): Promise<AuditEntry[]> {
  const res = await apiClient.get<AuditEntry[]>("/audit", { params: filters });
  return res.data;
}
