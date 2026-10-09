// ─── Vital-sign catalogue ────────────────────────────────────────────────────
// One definition for every portal that records or reads vitals, so a reading is
// flagged the same way at triage and in the doctor's visit. LOINC codes + UCUM
// units are what the observations are stored with.
//
// Ranges are adult triage guide values: `normal` is the reference band, values
// outside it but inside `alert` are flagged for attention, values outside
// `alert` are flagged critical. `scale` is the span drawn on a gauge;
// `plausible` rejects obvious typos before anything is saved.

export type VitalKey =
  | "bpSystolic" | "bpDiastolic" | "pulseBpm" | "spo2Percent"
  | "temperatureC" | "respirationRpm" | "heightCm" | "weightKg";

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
