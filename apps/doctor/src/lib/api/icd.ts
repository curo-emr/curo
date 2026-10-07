import { apiClient } from '@curo/web/api';
import { unwrapBundle, paginationParams, type FhirBundle, type PaginatedResult, type PaginationParams } from '@curo/web/fhir';
import type { ICD10 } from '@/types';

// Backend icd10_codes rows already match the frontend ICD10 shape.
type ApiIcd10 = ICD10;

// Server-driven search + pagination for the ICD-10 dictionary table.
export async function getICD10Paginated(params: PaginationParams = {}): Promise<PaginatedResult<ICD10>> {
  const res = await apiClient.get<ApiIcd10[] | FhirBundle<ApiIcd10>>('/icd10', {
    params: paginationParams(params),
  });
  const { resources, total } = unwrapBundle(res.data);
  return {
    items: resources,
    total,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 25,
  };
}

// Lightweight autocomplete: top matches for a search term (no pagination UI).
export async function searchICD10(search: string, limit = 8): Promise<ICD10[]> {
  if (!search.trim()) return [];
  const res = await apiClient.get<ApiIcd10[] | FhirBundle<ApiIcd10>>('/icd10', {
    params: { search, pageSize: limit },
  });
  return unwrapBundle(res.data).resources;
}
