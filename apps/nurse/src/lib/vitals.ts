import { BMI_CATEGORY_LABELS, VITAL_FIELDS, bmiCategory, calculateBMI, isPlausible, type BMICategory, type VitalField, type VitalLevel, type VitalAssessment } from "@curo/web/clinical";
import { toneClass } from "@curo/web/ui/status-badge";
import type { Vitals } from "@/types";

// The vital-sign catalogue and its adult ranges live in @curo/web/clinical, so a
// reading is flagged the same way here and in the doctor's visit.
export {
  VITAL_FIELDS, VITAL_FIELD, ADULT_FROM_AGE, adultRangesApply, assessVital, worstLevel, isPlausible,
  type VitalField, type VitalLevel, type VitalAssessment,
} from "@curo/web/clinical";

// ─── BMI ────────────────────────────────────────────────────────────────────

export { calculateBMI };

const BMI_LEVELS: Record<BMICategory, VitalLevel> = {
  underweight: "alert",
  healthy: "normal",
  overweight: "alert",
  obese: "critical",
};

export function assessBMI(bmi: number): VitalAssessment {
  const category = bmiCategory(bmi);
  return { level: BMI_LEVELS[category], label: BMI_CATEGORY_LABELS[category] };
}

// ─── Display ────────────────────────────────────────────────────────────────

/** A stored reading at the precision it's entered with: 36.67 °C reads "36.7", 170.0 cm reads "170". */
export function formatReading(field: VitalField, value: number): string {
  const decimals = (String(field.step).split(".")[1] ?? "").length;
  return String(Number(value.toFixed(decimals)));
}

// ─── Form input ─────────────────────────────────────────────────────────────

// Raw input strings per field (keeps partial input like "37." while typing).
export type VitalsDraft = Partial<Record<keyof Vitals, string>>;

export const toDraft = (vitals: Partial<Vitals>): VitalsDraft =>
  Object.fromEntries(Object.entries(vitals).map(([key, value]) => [key, String(value)]));

// Parsed values, plus the fields whose input is not a plausible reading.
export function parseDraft(draft: VitalsDraft): { values: Partial<Vitals>; invalid: (keyof Vitals)[] } {
  const values: Partial<Vitals> = {};
  const invalid: (keyof Vitals)[] = [];
  for (const field of VITAL_FIELDS) {
    const raw = draft[field.key]?.trim();
    if (!raw) continue;
    const n = Number(raw);
    if (Number.isFinite(n) && isPlausible(field, n)) values[field.key] = n;
    else invalid.push(field.key);
  }
  return { values, invalid };
}

// ─── Saving ─────────────────────────────────────────────────────────────────

// Fields worth recording as new observations: filled in and different from what
// is already recorded for this visit (re-opened triage only posts corrections).
export function changedVitalKeys(current: Partial<Vitals>, recorded: Partial<Vitals> = {}): (keyof Vitals)[] {
  return VITAL_FIELDS.map(f => f.key).filter(key => current[key] !== undefined && current[key] !== recorded[key]);
}

// ─── Shared styling per level (status design tokens) ────────────────────────

export const LEVEL_STYLES: Record<VitalLevel, { pill: string; tile: string; marker: string }> = {
  normal: {
    pill: toneClass("success"),
    tile: "",
    marker: "bg-status-success-text",
  },
  alert: {
    pill: toneClass("warning"),
    tile: "border-status-warning-border bg-status-warning-bg/35",
    marker: "bg-status-warning-text",
  },
  critical: {
    pill: toneClass("error"),
    tile: "border-status-error-border bg-status-error-bg/40",
    marker: "bg-status-error-text",
  },
};
