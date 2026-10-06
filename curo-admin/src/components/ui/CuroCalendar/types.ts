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
  /** Arbitrary domain data attached to the event */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export type CalendarView = "month";
