import { calculateAge } from "../format";

// ─── Vital-sign catalogue ────────────────────────────────────────────────────
// One definition for every portal that records or reads vitals, so a reading is
// flagged the same way at triage and in the doctor's visit. LOINC codes + UCUM
// units are what the observations are stored with.
//
// Ranges are adult triage guide values: `normal` is the reference band, values
// outside it but inside `alert` are flagged for attention, values outside
// `alert` are flagged critical. `scale` is the span drawn on a gauge;
// `plausible` rejects obvious typos before anything is saved; the clinical
// service refuses the same ranges (PLAUSIBLE_VITALS), so keep the two in step.

export type VitalKey =
  | "bpSystolic" | "bpDiastolic" | "pulseBpm" | "spo2Percent"
  | "temperatureC" | "respirationRpm" | "heightCm" | "weightKg";

/** One reading per vital sign: a triage form's values, or a visit's latest. */
export type Vitals = Record<VitalKey, number>;

type Range = readonly [number, number];

export interface VitalField {
  key: VitalKey;
  label: string;
  code: string;      // LOINC
  display: string;   // Observation.code.display
  unit: string;      // shown on screen
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

export const VITAL_FIELD = Object.fromEntries(VITAL_FIELDS.map(f => [f.key, f])) as Record<VitalKey, VitalField>;

// ─── Reading stored observations ────────────────────────────────────────────

/** The parts of a stored vitals Observation that `collapseVitals` reads. */
export interface VitalObservation {
  code?: { coding?: Array<{ code?: string }> };
  valueQuantity?: { value?: number };
  effectiveDateTime?: string;
}

const KEY_BY_CODE = new Map(VITAL_FIELDS.map(f => [f.code, f.key]));
const observedAt = (o: VitalObservation) => new Date(o.effectiveDateTime ?? 0).getTime();

/**
 * One value per vital from a set of observations, matched by LOINC code (stored displays and
 * units vary, e.g. bpm vs /min). A vital measured more than once keeps its most recent value.
 */
export function collapseVitals(observations: readonly VitalObservation[]): Partial<Record<VitalKey, number>> {
  const vitals: Partial<Record<VitalKey, number>> = {};
  for (const o of [...observations].sort((a, b) => observedAt(a) - observedAt(b))) {
    const key = KEY_BY_CODE.get(o.code?.coding?.[0]?.code ?? "");
    const value = o.valueQuantity?.value;
    if (key && typeof value === "number") vitals[key] = value;
  }
  return vitals;
}

// ─── Assessment ─────────────────────────────────────────────────────────────

export type VitalLevel = "normal" | "alert" | "critical";

export interface VitalAssessment {
  level: VitalLevel;
  label: string; // "Normal" | "High" | "Low" | "Very high" | "Very low"
}

/** Where a reading sits against the adult ranges; null for no reading or a field without ranges. */
export function assessVital(field: VitalField, value: number | null | undefined): VitalAssessment | null {
  if (value == null || !field.normal || !field.alert) return null;
  const [lo, hi] = field.normal;
  if (value >= lo && value <= hi) return { level: "normal", label: "Normal" };
  const direction = value > hi ? "high" : "low";
  const critical = value < field.alert[0] || value > field.alert[1];
  return critical
    ? { level: "critical", label: `Very ${direction}` }
    : { level: "alert", label: direction === "high" ? "High" : "Low" };
}

const LEVEL_RANK: Record<VitalLevel, number> = { normal: 0, alert: 1, critical: 2 };

/** The most worrying level among several readings, e.g. for blood pressure's two numbers. */
export function worstLevel(assessments: (VitalAssessment | null)[]): VitalLevel | null {
  return assessments.reduce<VitalLevel | null>(
    (worst, a) => (a && (!worst || LEVEL_RANK[a.level] > LEVEL_RANK[worst]) ? a.level : worst),
    null,
  );
}

export function isPlausible(field: VitalField, value: number): boolean {
  return value >= field.plausible[0] && value <= field.plausible[1];
}

// ─── Who the ranges fit ─────────────────────────────────────────────────────

/** The age from which the adult ranges above apply. */
export const ADULT_FROM_AGE = 18;

/**
 * Whether a patient's readings can be judged against the adult ranges. A child's normal
 * values depend on their age, and an unknown date of birth can't be checked, so neither is flagged.
 */
export function adultRangesApply(dob: string | null | undefined, on: Date = new Date()): boolean {
  const age = calculateAge(dob, on);
  return age !== null && age >= ADULT_FROM_AGE;
}
