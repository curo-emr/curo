import type { Vitals } from "@/types"

export { cn } from "@curo/web/ui/utils";
export { calculateBMI } from "@curo/web/clinical";
export { formatAgeSex, getInitials, getTodayString } from "@curo/web/format";

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

/** "19:00" → "7:00 PM" */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return time;
  return `${h % 12 || 12}:${String(m ?? 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
