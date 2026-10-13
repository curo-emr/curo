import { apiClient } from "../api";
import type { PersonName } from "../fhir";

/** A member of staff as the practitioner directory lists them. Anything not on file is blank. */
export interface Practitioner {
  id: string;
  name: PersonName;
  role: string;
  specialization: string;
  phone: string;
  email: string;
  qualification: string;
  licenseNumber: string;
  /** Where they work; null when not on file. */
  organizationId: string | null;
}

/** Active practitioners, by surname; only those with `role` (e.g. "DOCTOR") when given. */
export async function getPractitioners(role?: string): Promise<Practitioner[]> {
  const res = await apiClient.get<Practitioner[]>("/auth/practitioners", { params: role ? { role } : {} });
  return res.data;
}
