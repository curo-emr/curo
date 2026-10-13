import { apiClient } from "@curo/web/api";
import { unwrapBundle, type FhirBundle } from "@curo/web/fhir";

export interface Organization {
  id: string;
  name: string;
  type: string;
  city?: string;
  phone?: string;
}

/** One drug at a pharmacy, across all of its batches. */
export interface PharmacyStockItem {
  /** The drug's code: the pharmacy holds each drug once. */
  id: string;
  medicationName: string;
  genericName?: string;
  strength?: string;
  unit?: string;
  /** Units in batches that haven't expired. */
  usableQuantity: number;
  /** When the next batch to dispense expires. */
  nextExpiry: string | null;
}

// What GET /stock/grouped returns per drug, as far as the directory reads it.
type StockGroup = Omit<PharmacyStockItem, "id"> & { medicationCode: string };

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
  const res = await apiClient.get<StockGroup[]>("/stock/grouped", { params: { organizationId } });
  return res.data.map(({ medicationCode, ...drug }) => ({ ...drug, id: medicationCode }));
}

// Tests a chosen lab offers.
export async function getLabCatalog(organizationId: string): Promise<LabCatalogTest[]> {
  const res = await apiClient.get<LabCatalogTest[] | FhirBundle<LabCatalogTest>>("/catalog", { params: { organizationId } });
  return unwrapBundle(res.data).resources;
}
