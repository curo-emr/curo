import { apiClient } from './client';
import { unwrapBundle, paginationParams, type FhirBundle, type PaginationParams } from './fhir';
import type { Medication } from '@/types';

// Backend medication_catalog rows already match the frontend Medication shape.
type ApiMedication = Medication;

// Medication prescribing catalog (DB-backed) — replaces bundled medications.json.
// Requests a large page so existing dropdown consumers still receive the full set.
export async function getMedicationCatalog(params?: PaginationParams): Promise<Medication[]> {
  const res = await apiClient.get<ApiMedication[] | FhirBundle<ApiMedication>>('/medication-catalog', {
    params: { pageSize: 100, ...paginationParams(params) },
  });
  const { resources } = unwrapBundle(res.data);
  return resources;
}
