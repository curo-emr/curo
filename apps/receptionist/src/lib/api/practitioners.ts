import { apiClient } from '@curo/web/api';
import type { DoctorSession } from '@curo/web/schedule';
import type { Doctor } from '@/types';

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

// The doctors, each with their weekly sessions.
export async function getDoctors(): Promise<Doctor[]> {
  const [doctors, sessions] = await Promise.all([
    getPractitioners('DOCTOR'),
    apiClient.get<DoctorSession[]>('/schedules').then(res => res.data),
  ]);
  return doctors.map(p => ({
    id: p.id, name: p.name, specialty: p.specialty, phone: p.phone, email: p.email,
    sessions: sessions.filter(s => s.practitionerId === p.id),
  }));
}
