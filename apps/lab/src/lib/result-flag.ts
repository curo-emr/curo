/** FHIR interpretation codes the lab sets: below, within or above the reference range. */
export type Interpretation = 'L' | 'N' | 'H';

/** A typed result as a number, or null when it isn't one (e.g. "Positive"). */
export function parseNumeric(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Flags a numeric result against its range; null unless the value and both bounds are numbers. */
export function interpret(value: string, low: string, high: string): Interpretation | null {
  const [v, lo, hi] = [value, low, high].map(parseNumeric);
  if (v === null || lo === null || hi === null) return null;
  if (v < lo) return 'L';
  if (v > hi) return 'H';
  return 'N';
}
