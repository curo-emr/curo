import type { Tone } from "../ui/tones";

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
