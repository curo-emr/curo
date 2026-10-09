/**
 * The clinic's calendar, which isn't the server's: the services run on UTC, and
 * a Sri Lankan day starts at 18:30 UTC the evening before. Whole-day filters
 * and "today" are worked out in the clinic's time zone (CLINIC_TIME_ZONE, an IANA
 * name such as Asia/Colombo), never in the process's.
 *
 * Don't fix this by setting TZ on the services instead: most timestamp columns
 * are `without time zone` and hold the services' own wall-clock time, so every
 * stored time would shift.
 */

const DEFAULT_TIME_ZONE = 'Asia/Colombo';

/** The clinic's IANA time zone. A misspelt zone fails at the first use, not silently as UTC. */
export function clinicTimeZone(): string {
  const zone = process.env.CLINIC_TIME_ZONE || DEFAULT_TIME_ZONE;
  // Throws a RangeError for a zone the runtime doesn't know.
  new Intl.DateTimeFormat('en-US', { timeZone: zone });
  return zone;
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** How far `timeZone`'s clocks are ahead of UTC at `instant`, in milliseconds. */
function offsetAt(timeZone: string, instant: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const wallClock = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
  return wallClock - Math.floor(instant / 1000) * 1000;
}

/** The instant a calendar day begins in `timeZone`. */
function midnight(year: number, month: number, day: number, timeZone: string) {
  const asUtc = Date.UTC(year, month - 1, day);
  const guess = asUtc - offsetAt(timeZone, asUtc);
  // Where the offset changes (summer time) that night, measure it again at the guess.
  return new Date(asUtc - offsetAt(timeZone, guess));
}

/**
 * The first and last instants of `day` ("YYYY-MM-DD") on the clinic's calendar,
 * or null when it isn't a date.
 */
export function clinicDayBounds(
  day: string,
  timeZone = clinicTimeZone(),
): { start: Date; end: Date } | null {
  const match = DAY.exec(day);
  if (!match) return null;
  const [year, month, date] = match.slice(1).map(Number);
  const start = midnight(year, month, date, timeZone);
  // Date.UTC rolls an impossible date over (Feb 30 → Mar 2); refuse it instead.
  if (clinicDate(start, timeZone) !== day) return null;
  const next = midnight(year, month, date + 1, timeZone);
  return { start, end: new Date(next.getTime() - 1) };
}

/** The clinic's calendar date at `instant` (now by default), as "YYYY-MM-DD". */
export function clinicDate(
  instant: Date = new Date(),
  timeZone = clinicTimeZone(),
): string {
  // en-CA writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}
