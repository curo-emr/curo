import { apiClient, getAllPages } from "@curo/web/api";
import type { AdminUser } from "@/types";
import { unwrapBundle, paginationParams, type FhirBundle, type PaginatedResult, type PaginationParams } from "@curo/web/fhir";

export interface CreateUserInput {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  gender?: string;
  phone?: string;
  specialization?: string;
  qualification?: string;
  licenseNumber?: string;
  organizationId?: string;
  patientId?: string;
}

export interface UpdateUserInput {
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
  phone?: string;
  specialization?: string;
  qualification?: string;
  licenseNumber?: string;
  organizationId?: string;
}

// Every user with a staff role, such as all the receptionists.
export async function getUsersByRole(role: string): Promise<AdminUser[]> {
  return getAllPages<AdminUser>("/auth/users", { role });
}

export interface UserSummary {
  total: number;
  active: number;
  byRole: Record<string, number>;
}

// How many users there are, how many are active, and how many have each role.
export async function getUserSummary(): Promise<UserSummary> {
  const res = await apiClient.get<UserSummary>("/auth/users/summary");
  return res.data;
}

export async function getUsersPaginated(
  params: PaginationParams & { role?: string } = {},
): Promise<PaginatedResult<AdminUser>> {
  const { role, ...rest } = params;
  const res = await apiClient.get<AdminUser[] | FhirBundle<AdminUser>>("/auth/users", {
    params: { ...paginationParams(rest), ...(role ? { role } : {}) },
  });
  const { resources, total } = unwrapBundle(res.data);
  return { items: resources, total, page: params.page ?? 1, pageSize: params.pageSize ?? 25 };
}

export async function getUser(id: string): Promise<AdminUser> {
  const res = await apiClient.get<AdminUser>(`/auth/users/${id}`);
  return res.data;
}

export async function createUser(input: CreateUserInput) {
  const res = await apiClient.post("/auth/users", input);
  return res.data;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<AdminUser> {
  const res = await apiClient.patch<AdminUser>(`/auth/users/${id}`, input);
  return res.data;
}

export async function resetUserPassword(id: string, newPassword: string) {
  const res = await apiClient.post(`/auth/users/${id}/reset-password`, { newPassword });
  return res.data;
}
