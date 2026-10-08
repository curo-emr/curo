import { BMI_CATEGORY_LABELS, bmiCategory, calculateBMI, type BMICategory } from "@curo/web/clinical";
import type { Vitals } from "@/types";

// ─── Vital-sign catalogue ────────────────────────────────────────────────────
// LOINC codes + UCUM units match the doctor portal's VITALS_MAP so both portals
// read and write the same observations.
//
// Ranges are adult triage guide values: `normal` is the reference band, values
// outside it but inside `alert` are flagged for attention, values outside
// `alert` are flagged critical. `scale` is the span drawn on the gauge;
// `plausible` rejects obvious typos before anything is saved.

type Range = readonly [number, number];

export interface VitalField {
  key: keyof Vitals;
  label: string;
  code: string;      // LOINC
  display: string;   // Observation.code.display
  unit: string;      // shown to the nurse
  ucum: string;      // stored on the observation
  step: number;
  plausible: Range;
  scale?: Range;
  normal?: Range;
  alert?: Range;
}

export const VITAL_FIELDS: VitalField[] = [
  { key: "bpSystolic", label: "Systolic", code: "8480-6", display: "Blood Pressure Systolic", unit: "mmHg", ucum: "mmHg", step: 1, plausible: [50, 260], scale: [60, 200], normal: [90, 129], alert: [80, 179] },
  { key: "bpDiastolic", label: "Diastolic", code: "8462-4", display: "Blood Pressure Diastolic", unit: "mmHg", ucum: "mmHg", step: 1, plausible: [20, 160], scale: [30, 130], normal: [60, 79], alert: [50, 119] },
  { key: "pulseBpm", label: "Pulse", code: "8867-4", display: "Heart rate", unit: "bpm", ucum: "bpm", step: 1, plausible: [20, 250], scale: [30, 180], normal: [60, 100], alert: [50, 120] },
  { key: "spo2Percent", label: "SpO₂", code: "2708-6", display: "Oxygen saturation", unit: "%", ucum: "%", step: 1, plausible: [50, 100], scale: [80, 100], normal: [95, 100], alert: [92, 100] },
  { key: "temperatureC", label: "Temperature", code: "8310-5", display: "Body temperature", unit: "°C", ucum: "Cel", step: 0.1, plausible: [30, 45], scale: [34, 42], normal: [36.1, 37.5], alert: [35, 39.4] },
  { key: "respirationRpm", label: "Respiration", code: "9279-1", display: "Respiratory rate", unit: "/min", ucum: "/min", step: 1, plausible: [4, 60], scale: [4, 40], normal: [12, 20], alert: [9, 24] },
  { key: "heightCm", label: "Height", code: "8302-2", display: "Body height", unit: "cm", ucum: "cm", step: 0.5, plausible: [30, 250] },
  { key: "weightKg", label: "Weight", code: "29463-7", display: "Body weight", unit: "kg", ucum: "kg", step: 0.1, plausible: [1, 350] },
];

export const VITAL_FIELD = Object.fromEntries(VITAL_FIELDS.map(f => [f.key, f])) as Record<keyof Vitals, VitalField>;

// ─── Assessment ─────────────────────────────────────────────────────────────

export type VitalLevel = "normal" | "alert" | "critical";

export interface VitalAssessment {
  level: VitalLevel;
  label: string; // "Normal" | "High" | "Low" | "Very high" | "Very low"
}

export function assessVital(field: VitalField, value: number | undefined): VitalAssessment | null {
  if (value === undefined || !field.normal || !field.alert) return null;
  const [lo, hi] = field.normal;
  if (value >= lo && value <= hi) return { level: "normal", label: "Normal" };
  const direction = value > hi ? "high" : "low";
  const critical = value < field.alert[0] || value > field.alert[1];
  return critical
    ? { level: "critical", label: `Very ${direction}` }
    : { level: "alert", label: direction === "high" ? "High" : "Low" };
}

const LEVEL_RANK: Record<VitalLevel, number> = { normal: 0, alert: 1, critical: 2 };

export function worstLevel(assessments: (VitalAssessment | null)[]): VitalLevel | null {
  return assessments.reduce<VitalLevel | null>(
    (worst, a) => (a && (!worst || LEVEL_RANK[a.level] > LEVEL_RANK[worst]) ? a.level : worst),
    null,
  );
}

export function isPlausible(field: VitalField, value: number): boolean {
  return value >= field.plausible[0] && value <= field.plausible[1];
}

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
    pill: "bg-status-success-bg text-status-success-text border-status-success-border",
    tile: "",
    marker: "bg-status-success-text",
  },
  alert: {
    pill: "bg-status-warning-bg text-status-warning-text border-status-warning-border",
    tile: "border-status-warning-border bg-status-warning-bg/35",
    marker: "bg-status-warning-text",
  },
  critical: {
    pill: "bg-status-error-bg text-status-error-text border-status-error-border",
    tile: "border-status-error-border bg-status-error-bg/40",
    marker: "bg-status-error-text",
  },
};
