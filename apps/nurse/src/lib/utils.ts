export { cn } from "@curo/web/ui/utils";
export { formatTime, getTodayString, minutesSince } from "@curo/web/format";

// Personal Health Number, grouped for reading aloud: 202612345678 → "2026 1234 5678"
export function formatPhn(phn: string): string {
  return phn ? phn.replace(/(\d{4})(?=\d)/g, '$1 ') : '';
}
