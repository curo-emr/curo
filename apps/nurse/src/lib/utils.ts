export { cn } from "@curo/web/ui/utils";
export { getTodayString } from "@curo/web/format";

// "14:30" → "2:30 PM"
export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

// Whole minutes elapsed since an ISO timestamp (never negative).
export function minutesSince(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

// Personal Health Number, grouped for reading aloud: 202612345678 → "2026 1234 5678"
export function formatPhn(phn: string): string {
  return phn ? phn.replace(/(\d{4})(?=\d)/g, '$1 ') : '';
}
