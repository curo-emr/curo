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
