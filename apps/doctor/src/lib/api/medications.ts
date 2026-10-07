import { apiClient } from '@curo/web/api';
import { unwrapBundle, paginationParams, type FhirBundle } from '@curo/web/fhir';
import type { Medication } from '@/types';

// Backend medication_catalog rows already match the frontend Medication shape.
type ApiMedication = Medication;

// The prescribing catalog is searched on the server: a formulary is far bigger
// than the 100 rows one page can hold. An empty search returns the first `limit`.
export async function searchMedications(search: string, limit = 8): Promise<Medication[]> {
  const res = await apiClient.get<ApiMedication[] | FhirBundle<ApiMedication>>('/medication-catalog', {
    params: paginationParams({ search: search.trim(), pageSize: limit }),
  });
  return unwrapBundle(res.data).resources;
}
