import { getTodayString } from "@curo/web/format";

// Dates as a patient reads them, in the browser's (the clinic's) time zone.

export { formatDate, formatDay, formatTime } from "@curo/web/format";

/** The local calendar day of an instant (YYYY-MM-DD), to compare with `getTodayString()`. */
export const dayOf = (iso: string) => getTodayString(new Date(iso));

/** A count with its noun: "1 visit", "2 visits". */
export const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
