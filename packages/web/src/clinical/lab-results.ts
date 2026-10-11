import type { Tone } from "../ui/tones";
import { adultRangesApply } from "./vitals";

// ─── Lab result flags ────────────────────────────────────────────────────────
// One reading of a result's FHIR interpretation code (v3 ObservationInterpretation)
// for every portal: the lab that files it, the doctor who reads it.

export type ResultFlag = "normal" | "low" | "high" | "abnormal" | "critical";

const FLAG_OF_CODE: Record<string, ResultFlag> = {
  N: "normal",
  L: "low",
  H: "high",
  A: "abnormal",
  LL: "critical",
  HH: "critical",
  AA: "critical",
};

/** A result's interpretation code as a flag; undefined when it has none, or one this list doesn't know. */
export function resultFlag(code?: string | null): ResultFlag | undefined {
  return code ? FLAG_OF_CODE[code.trim().toUpperCase()] : undefined;
}

/** Whether a result is outside its reference range. */
export const isAbnormalResult = (flag?: ResultFlag): flag is Exclude<ResultFlag, "normal"> =>
  flag !== undefined && flag !== "normal";

/** What each flag reads as on a badge, and its colour. */
export const RESULT_FLAG_META: Record<ResultFlag, { label: string; tone: Tone }> = {
  normal: { label: "Normal", tone: "success" },
  low: { label: "Low", tone: "info" },
  high: { label: "High", tone: "warning" },
  abnormal: { label: "Abnormal", tone: "warning" },
  critical: { label: "Critical", tone: "error" },
};

// ─── Reference ranges ────────────────────────────────────────────────────────
// A lab's catalog lists what each test reports: per analyte, its unit and the adult
// reference range, with a range per sex where the sexes differ (e.g. haemoglobin).

export interface ReferenceRange {
  low: number;
  high: number;
}

/** One value a catalog test reports. A panel (e.g. a full blood count) has several. */
export interface LabAnalyte {
  code: string; // LOINC
  display: string;
  unit: string;
  low?: number;
  high?: number;
  male?: ReferenceRange;
  female?: ReferenceRange;
}

/**
 * The range a patient's result is read against: their sex's where the catalog has one,
 * otherwise the general one. Null for a child or an unknown date of birth, as the ranges
 * are adult ones (the same rule as vitals), and for an analyte without a range.
 */
export function referenceRangeFor(
  analyte: LabAnalyte,
  patient: { sex?: string | null; dob?: string | null },
  on: Date = new Date(),
): ReferenceRange | null {
  if (!adultRangesApply(patient.dob, on)) return null;
  const bySex = patient.sex === "male" || patient.sex === "female" ? analyte[patient.sex] : undefined;
  if (bySex) return bySex;
  return analyte.low != null && analyte.high != null ? { low: analyte.low, high: analyte.high } : null;
}

/** A reference range as the portals print it: "12 - 16". Empty when neither end is known. */
export function formatRange(low?: number | string | null, high?: number | string | null): string {
  return [low, high].filter(v => v != null && v !== "").join(" - ");
}
