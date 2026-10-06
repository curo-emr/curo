import { apiClient } from './client';

export interface Practitioner {
  id: string;
  name: { first: string; last: string; full: string };
  role: string;
  specialty: string;
  phone: string;
  email: string;
  qualification: string;
  licenseNumber: string;
}

export async function getPractitioners(role?: string): Promise<Practitioner[]> {
  const params = role ? { role } : {};
  const res = await apiClient.get<Practitioner[]>('/auth/practitioners', { params });
  return res.data;
}

export async function getDoctors(): Promise<Practitioner[]> {
  return getPractitioners('DOCTOR');
}
