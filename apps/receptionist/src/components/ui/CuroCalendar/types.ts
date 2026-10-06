export type CalendarEventColor =
  | "blue"
  | "green"
  | "yellow"
  | "red"
  | "purple"
  | "teal"
  | "gray";

/**
 * A generic calendar event. Extend with domain-specific fields via the index
 * signature — they are preserved and accessible via direct access, but the
 * calendar itself only reads `id`, `date`, `title`, `subtitle`, and `color`.
 */
export interface CalendarEvent {
  id: string;
  /** ISO date string: YYYY-MM-DD */
  date: string;
  title: string;
  subtitle?: string;
  color?: CalendarEventColor;
}

export type CalendarView = "month";
