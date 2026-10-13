import { clinicClock, clinicTimeZone } from '@curo/shared/config';

/** A weekly session as the API takes and gives it; times are "HH:MM". */
export interface SessionTimes {
  weekday: number;
  start: string;
  end: string;
}

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const label = (s: SessionTimes) =>
  `${WEEKDAY_NAMES[s.weekday]} ${s.start}–${s.end}`;

/** A session as the API gives it back, with its slot length and room. */
export interface Session extends SessionTimes {
  slotMinutes: number;
  room: string | null;
}

/**
 * What changed between two versions of a week, in words for the audit log,
 * or null when nothing did: "added Saturday 08:00–12:00; changed Monday
 * 08:00–12:00". Sessions are matched by day and hours, so one moved to other
 * hours is removed and added; "changed" is a new room or slot length. Both
 * weeks are in day and time order, as the API gives them.
 */
export function weekChange(before: Session[], after: Session[]): string | null {
  const was = new Map(before.map((s) => [label(s), s]));
  const now = new Set(after.map(label));
  const changed = (s: Session) => {
    const old = was.get(label(s));
    return old && (old.slotMinutes !== s.slotMinutes || old.room !== s.room);
  };
  const groups: [string, Session[]][] = [
    ['added', after.filter((s) => !was.has(label(s)))],
    ['removed', before.filter((s) => !now.has(label(s)))],
    ['changed', after.filter(changed)],
  ];
  const parts = groups
    .filter(([, sessions]) => sessions.length)
    .map(([done, sessions]) => `${done} ${sessions.map(label).join(', ')}`);
  return parts.length ? parts.join('; ') : null;
}

/**
 * Why a doctor's week can't be saved, or null when it can: a session that
 * doesn't end after it starts, or two on the same day that overlap.
 */
export function sessionProblem(sessions: SessionTimes[]): string | null {
  const backwards = sessions.find((s) => minutes(s.end) <= minutes(s.start));
  if (backwards) return `${label(backwards)} must end after it starts`;

  const sorted = [...sessions].sort(
    (a, b) => a.weekday - b.weekday || minutes(a.start) - minutes(b.start),
  );
  for (let i = 1; i < sorted.length; i++) {
    const [before, after] = [sorted[i - 1], sorted[i]];
    if (
      before.weekday === after.weekday &&
      minutes(after.start) < minutes(before.end)
    ) {
      return `${label(before)} overlaps ${after.start}–${after.end}`;
    }
  }
  return null;
}

/**
 * Why `start`–`end` can't be booked with a doctor who keeps `sessions`, or
 * null when it can. It must end after it starts, not be over by `now` (a slot
 * under way can still take a walk-in), and fall within one of the sessions on
 * the clinic's clock.
 */
export function bookingProblem(
  start: Date,
  end: Date,
  sessions: readonly SessionTimes[],
  now = new Date(),
  timeZone = clinicTimeZone(),
): string | null {
  if (end <= start) return 'An appointment must end after it starts';
  if (end <= now) return 'That time has already passed. Pick a later one.';

  const from = clinicClock(start, timeZone);
  const to = clinicClock(end, timeZone);
  const inSession =
    from.date === to.date &&
    sessions.some(
      (s) =>
        s.weekday === from.weekday &&
        minutes(s.start) <= from.minutes &&
        to.minutes <= minutes(s.end),
    );
  return inSession
    ? null
    : "The doctor doesn't see patients at that time. Pick a time in one of their sessions.";
}
