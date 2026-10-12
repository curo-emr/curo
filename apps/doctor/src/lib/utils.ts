import type { Vitals } from "@/types"

export { cn } from "@curo/web/ui/utils";
export { calculateBMI } from "@curo/web/clinical";
export { formatAgeSex, formatDate, formatTime, getInitials, getTodayString } from "@curo/web/format";

// Vitals fields that should be recorded as new observations: filled in and
// different from what was already recorded (e.g. by the nurse at triage).
export function changedVitalKeys(current: Partial<Vitals>, recorded: Partial<Vitals> = {}): (keyof Vitals)[] {
  return (Object.keys(current) as (keyof Vitals)[]).filter(
    key => (current[key] ?? 0) > 0 && current[key] !== recorded[key],
  );
}
