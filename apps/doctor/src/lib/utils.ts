import type { Vitals } from "@/types"

export { cn } from "@curo/web/ui/utils";

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





/** "Amali Dissanayake" → "AD" */
export function getInitials(name?: string | null): string {
  if (!name) return '';
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/** "female" → "Female" */
export function formatSex(sex?: string | null): string {
  return sex ? sex.charAt(0).toUpperCase() + sex.slice(1) : '';
}

/** "35y · Female" from a DOB + sex. */
export function formatAgeSex(dob: string, sex?: string | null): string {
  return [dob ? `${calculateAge(dob)}y` : '', formatSex(sex)].filter(Boolean).join(' · ');
}

/** "19:00" → "7:00 PM" */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return time;
  return `${h % 12 || 12}:${String(m ?? 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Relative "just now / 5 min ago / 2 h ago", falling back to a date. */
export function formatRelative(iso: string | number | Date): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDate(new Date(iso).toISOString());
}
