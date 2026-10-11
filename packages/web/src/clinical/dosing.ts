// ─── How often to take a medicine ────────────────────────────────────────────
// Doctors write the frequency in prescription shorthand (BD, TDS, Q6H PRN).
// A patient reads it in plain words.

const FREQUENCY_WORDS: Record<string, string> = {
  OD: "once a day",
  QD: "once a day",
  BD: "twice a day",
  BID: "twice a day",
  TDS: "three times a day",
  TID: "three times a day",
  QDS: "four times a day",
  QID: "four times a day",
  MANE: "in the morning",
  QAM: "in the morning",
  NOCTE: "at night",
  ON: "at night",
  QN: "at night",
  HS: "at bedtime",
  PRN: "when needed",
  SOS: "when needed",
  STAT: "straight away",
};

/** One shorthand word in plain words, e.g. "Q6H" → "every 6 hours"; undefined if it isn't shorthand. */
function wordOf(token: string): string | undefined {
  const code = token.toUpperCase().replace(/\./g, "");
  const hours = /^Q(\d+)H$/.exec(code)?.[1];
  if (hours) return hours === "1" ? "every hour" : `every ${hours} hours`;
  return FREQUENCY_WORDS[code];
}

/**
 * A prescription frequency in plain words, e.g. "BID" → "Twice a day" and
 * "Q6H PRN" → "Every 6 hours, when needed". Anything not in shorthand is shown
 * as written.
 */
export function frequencyLabel(frequency?: string | null): string {
  const written = frequency?.trim() ?? "";
  const words = written.split(/\s+/).map(wordOf);
  if (!written || words.some(w => w === undefined)) return written;
  const text = words.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
