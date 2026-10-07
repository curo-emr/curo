import { apiClient } from "@curo/web/api";
import type { AuditEntry } from "@/types";
import { unwrapBundle, paginationParams, type FhirBundle, type PaginatedResult, type PaginationParams } from "@curo/web/fhir";

interface AuditFilters {
  userId?: string;
  resourceType?: string;
  from?: string;
  to?: string;
}

export async function getAuditLogs(filters?: AuditFilters): Promise<AuditEntry[]> {
  const res = await apiClient.get<AuditEntry[] | FhirBundle<AuditEntry>>("/audit", {
    params: { ...filters, pageSize: 100 },
  });
  return unwrapBundle(res.data).resources;
}

export async function getAuditLogsPaginated(
  params: Omit<PaginationParams, "search"> & AuditFilters = {},
): Promise<PaginatedResult<AuditEntry>> {
  const { page, pageSize, ...filters } = params;
  const res = await apiClient.get<AuditEntry[] | FhirBundle<AuditEntry>>("/audit", {
    params: { ...paginationParams({ page, pageSize }), ...filters },
  });
  const { resources, total } = unwrapBundle(res.data);
  return { items: resources, total, page: params.page ?? 1, pageSize: params.pageSize ?? 25 };
}
