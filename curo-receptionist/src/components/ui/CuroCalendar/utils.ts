export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Format a Date to YYYY-MM-DD using local time. */
export function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Returns an array of exactly 42 Date objects (6 rows × 7 columns) that
 * represent the calendar grid for the given year/month. Days outside the
 * current month are included for padding.
 */
export function getCalendarDays(year: number, month: number): Date[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startPad = firstDayOfMonth.getDay(); // 0 = Sunday

  const days: Date[] = [];

  // Previous-month padding
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, 0);
    days.push(new Date(year, month - 1, d.getDate() - i));
  }

  // Current month
  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Next-month padding to complete 42 cells
  let nextDay = 1;
  while (days.length < 42) {
    days.push(new Date(year, month + 1, nextDay++));
  }

  return days;
}

/** Returns true if the given date is today (local time). */
export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** Returns true if two dates fall on the same calendar day (local time). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Returns a new Date with the given number of months added (handles year rollover). */
export function addMonths(date: Date, count: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + count);
  return d;
}

/** Returns a human-readable relative label for a date (Today / Tomorrow / Yesterday). */
export function getRelativeDayLabel(date: Date): string | null {
  const today = new Date();
  const diff = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86400000
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return null;
}
