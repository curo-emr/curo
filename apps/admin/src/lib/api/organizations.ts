import { apiClient } from "./client";
import type { Organization } from "@/types";
import type { OrganizationType } from "@/lib/constants";

export type OrganizationInput = Omit<Organization, "id" | "active">;

export interface ListOrganizationsParams {
  type?: OrganizationType;
  includeInactive?: boolean;
}

export async function getOrganizations(params: ListOrganizationsParams = {}): Promise<Organization[]> {
  const res = await apiClient.get<Organization[]>("/organizations", {
    params: { type: params.type, includeInactive: params.includeInactive || undefined },
  });
  return res.data;
}

export async function createOrganization(input: OrganizationInput): Promise<Organization> {
  const res = await apiClient.post<Organization>("/organizations", input);
  return res.data;
}

// The type can't change once created (staff and stock depend on it).
export async function updateOrganization(
  id: string,
  input: Partial<Omit<OrganizationInput, "type">> & { active?: boolean },
): Promise<Organization> {
  const res = await apiClient.patch<Organization>(`/organizations/${id}`, input);
  return res.data;
}
