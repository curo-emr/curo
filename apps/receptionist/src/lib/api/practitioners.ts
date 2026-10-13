import { apiClient } from '@curo/web/api';
import { getPractitioners } from '@curo/web/practitioners';
import type { DoctorSession } from '@curo/web/schedule';
import type { Doctor } from '@/types';

// The doctors, each with their weekly sessions.
export async function getDoctors(): Promise<Doctor[]> {
  const [doctors, sessions] = await Promise.all([
    getPractitioners('DOCTOR'),
    apiClient.get<DoctorSession[]>('/schedules').then(res => res.data),
  ]);
  return doctors.map(p => ({
    id: p.id, name: p.name, specialization: p.specialization, phone: p.phone, email: p.email,
    sessions: sessions.filter(s => s.practitionerId === p.id),
  }));
}
