import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateBMI(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg) return 0;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

export type BMICategory = 'normal' | 'overweight' | 'obese';

export function getBMICategory(bmi: number): BMICategory {
  if (bmi >= 30) return 'obese';
  if (bmi >= 25) return 'overweight';
  return 'normal';
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

export function calculateAge(dobStr: string): number {
  if (!dobStr) return 0;
  const dob = new Date(dobStr);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getDoctorName(id: string, doctors: { id: string; name: { full: string } }[]): string {
  return doctors.find(d => d.id === id)?.name.full || "Unknown Doctor";
}

export function getTestName(testId: string, catalog: { id: string; name: string; code: string }[]): string {
  const test = catalog.find(t => t.id === testId);
  return test ? `${test.name} (${test.code})` : testId;
}
