import { apiClient } from '@curo/web/api';
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

// The doctors, with the booking defaults the desk schedules them by.
export async function getDoctors(): Promise<Doctor[]> {
  return (await getPractitioners('DOCTOR')).map(p => ({
    id: p.id, name: p.name, specialty: p.specialty,
    phone: p.phone, email: p.email, roomNumber: '',
    availableDays: [], slotDurationMinutes: 30,
    workingHours: { start: '08:00', end: '17:00' },
  }));
}
