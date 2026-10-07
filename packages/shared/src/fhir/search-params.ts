/**
 * Helpers for list filters read from the query string.
 *
 * `parseList` splits a comma-separated param (`status=draft,active`);
 * `parseUuidList` does the same for a uuid column, where any other value would
 * be a query error; `escapeLike` makes free text literal inside an ILIKE pattern;
 * `dayBounds` turns a date param into the instants a whole-day filter spans.
 */

import { BadRequestException } from '@nestjs/common';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A comma-separated param as its trimmed, non-empty values: `"a, b,,c"` → `['a', 'b', 'c']`. */
export function parseList(param?: string | string[]): string[] {
  const joined = Array.isArray(param) ? param.join(',') : (param ?? '');
  return joined
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Like `parseList`, keeping only the values that are UUIDs. */
export function parseUuidList(param?: string | string[]): string[] {
  return parseList(param).filter((value) => UUID_RE.test(value));
}

/** `text` as a literal inside an ILIKE pattern: `50%_off` matches only itself. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * The first and last instants of `day` (a YYYY-MM-DD param) in the server's time
 * zone, for filters over whole days. A 400 when it isn't a date.
 */
export function dayBounds(day: string): { start: Date; end: Date } {
  const start = new Date(day);
  if (Number.isNaN(start.getTime()))
    throw new BadRequestException(`${day} is not a date`);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
