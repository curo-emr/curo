import { apiClient } from './client';
import { unwrapBundle, type FhirBundle } from './fhir';
import type { LabTestCatalogItem } from '@/types';

// Raw shape returned by the lab-service /catalog endpoint.
interface ApiCatalogItem {
  id: string;
  organizationId?: string | null;
  code: string;
  name: string;
  category?: string | null;
  specimen?: string | null;
  price?: number | string | null;
}

function mapCatalogItem(item: ApiCatalogItem): LabTestCatalogItem {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category ?? '',
    labId: item.organizationId ?? null,
  };
}

// Lab test catalog (DB-backed) — replaces the old bundled lab-tests.json.
export async function getLabTestCatalog(params?: {
  organizationId?: string;
}): Promise<LabTestCatalogItem[]> {
  const res = await apiClient.get<ApiCatalogItem[] | FhirBundle<ApiCatalogItem>>('/catalog', { params });
  const { resources } = unwrapBundle(res.data);
  return resources.map(mapCatalogItem);
}
