import { apiClient } from "./client";
import type { AdminUser } from "@/types";

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
}

export async function getUsers(search?: string, role?: string): Promise<AdminUser[]> {
  const res = await apiClient.get<AdminUser[]>("/auth/users", { params: { search, role } });
  return res.data;
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
