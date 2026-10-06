import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Vitals } from "@/types"

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

// Vitals fields that should be recorded as new observations: filled in and
// different from what was already recorded (e.g. by the nurse at triage).
export function changedVitalKeys(current: Partial<Vitals>, recorded: Partial<Vitals> = {}): (keyof Vitals)[] {
  return (Object.keys(current) as (keyof Vitals)[]).filter(
    key => (current[key] ?? 0) > 0 && current[key] !== recorded[key],
  );
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

/**
 * Converts a snake_case status string to human-readable Title Case.
 * e.g. "sent_to_pharmacy" → "Sent To Pharmacy"
 */
export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Returns today's date as a YYYY-MM-DD string in local time.
 */
export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Look up a patient's full name by ID.
 */
export function getPatientName(id: string, patients: { id: string; name: { full: string } }[]): string {
  return patients.find(p => p.id === id)?.name.full || "Unknown Patient";
}

/**
 * Look up a patient's age and sex by ID.
 */
export function getPatientMeta(id: string, patients: { id: string; dob: string; sex: string }[]): { age: number; sex: string } | null {
  const p = patients.find(pat => pat.id === id);
  if (!p) return null;
  return { age: calculateAge(p.dob), sex: p.sex };
}

/**
 * Look up a lab test display name from catalog by test ID.
 */
export function getTestName(testId: string, catalog: { id: string; name: string; code: string }[]): string {
  const test = catalog.find(t => t.id === testId);
  return test ? `${test.name} (${test.code})` : testId;
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function generateMRN(): string {
  const num = Math.floor(Math.random() * 9000000) + 1000000;
  return `CURO-${num}`;
}

/**
 * Returns the left-border color class for a given appointment status.
 */
export function getStatusBorderClass(status: string): string {
  switch (status) {
    case 'waiting': return 'border-l-4 border-l-status-warning-text';
    case 'in_progress': return 'border-l-4 border-l-primary';
    case 'completed': return 'border-l-4 border-l-status-success-text';
    default: return 'border-l-4 border-l-border';
  }
}
