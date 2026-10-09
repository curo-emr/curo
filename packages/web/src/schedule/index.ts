/** One weekly session in which a doctor sees patients, as `GET /schedules` gives it. */
export interface DoctorSession {
  practitionerId: string;
  /** 0 = Sunday … 6 = Saturday, as `Date#getDay`. */
  weekday: number;
  /** Clock times, "HH:MM". */
  start: string;
  end: string;
  slotMinutes: number;
  room: string | null;
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** An appointment time a session offers. */
export interface Slot {
  time: string;
  minutes: number;
  room: string | null;
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** The weekday of a calendar date, "YYYY-MM-DD", read as a date, not a UTC instant. */
export function weekdayOf(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

/** The sessions a doctor holds on a calendar date, earliest first. */
export function sessionsOn(sessions: readonly DoctorSession[], date: string): DoctorSession[] {
  const weekday = weekdayOf(date);
  return sessions.filter(s => s.weekday === weekday).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

/** Every appointment time on a date: each session cut into its slots; a slot that would run past the end is left out. */
export function slotsOn(sessions: readonly DoctorSession[], date: string): Slot[] {
  return sessionsOn(sessions, date).flatMap(s => {
    const slots: Slot[] = [];
    for (let t = toMinutes(s.start); t + s.slotMinutes <= toMinutes(s.end); t += s.slotMinutes) {
      slots.push({ time: toTime(t), minutes: s.slotMinutes, room: s.room });
    }
    return slots;
  });
}

/** The days a doctor works, in week order from Monday: "Mon, Wed, Fri". */
export function workingDays(sessions: readonly DoctorSession[]): string {
  const days = new Set(sessions.map(s => s.weekday));
  return [1, 2, 3, 4, 5, 6, 0]
    .filter(d => days.has(d))
    .map(d => WEEKDAYS[d].slice(0, 3))
    .join(", ");
}
