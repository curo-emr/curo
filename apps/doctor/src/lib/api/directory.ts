import { apiClient } from "./client";
import { unwrapBundle, type FhirBundle } from "./fhir";

export interface Organization {
  id: string;
  name: string;
  type: string;
  city?: string;
  phone?: string;
}

export interface PharmacyStockItem {
  id: string;
  medicationCode: string;
  medicationName: string;
  genericName?: string;
  strength?: string;
  form?: string;
  quantity: number;
  unit?: string;
  expiryDate?: string;
  batchNumber?: string;
}

export interface LabCatalogTest {
  id: string;
  code: string;
  name: string;
  category?: string;
  specimen?: string;
  price?: number;
}

export async function getOrganizations(type?: "pharmacy" | "laboratory"): Promise<Organization[]> {
  const res = await apiClient.get<Organization[]>("/organizations", { params: type ? { type } : {} });
  return res.data;
}

// Read-only view of a chosen pharmacy's inventory (doctors check drug availability).
export async function getPharmacyStock(organizationId: string): Promise<PharmacyStockItem[]> {
  const res = await apiClient.get<PharmacyStockItem[] | FhirBundle<PharmacyStockItem>>("/stock", {
    params: { organizationId, pageSize: 100 },
  });
  return unwrapBundle(res.data).resources;
}

// Tests a chosen lab offers.
export async function getLabCatalog(organizationId: string): Promise<LabCatalogTest[]> {
  const res = await apiClient.get<LabCatalogTest[] | FhirBundle<LabCatalogTest>>("/catalog", { params: { organizationId } });
  return unwrapBundle(res.data).resources;
}
