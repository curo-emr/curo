import { getTodayString } from "@curo/web/format";

// Dates as a patient reads them, in the browser's (the clinic's) time zone.

/** "Oct 7, 2026" for an instant or a calendar date (YYYY-MM-DD, read as that day); empty for none. */
export function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00` : iso);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "2:30 PM". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "Tuesday, October 7". */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/** The local calendar day of an instant (YYYY-MM-DD), to compare with `getTodayString()`. */
export const dayOf = (iso: string) => getTodayString(new Date(iso));

/** A count with its noun: "1 visit", "2 visits". */
export const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
