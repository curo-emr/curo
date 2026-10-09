import type { Vitals } from "@/types"

export { cn } from "@curo/web/ui/utils";
export { calculateBMI } from "@curo/web/clinical";

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
 * Look up a patient's age and sex by ID.
 */
export function getPatientMeta(id: string, patients: { id: string; dob: string; sex: string }[]): { age: number; sex: string } | null {
  const p = patients.find(pat => pat.id === id);
  if (!p) return null;
  return { age: calculateAge(p.dob), sex: p.sex };
}





export { getInitials } from "@curo/web/format";

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