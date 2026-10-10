import { clinicDate } from '@curo/shared/config';

/** The clinic's date `days` from today (negative for the past), as the services see "today". */
export const daysFromToday = (days: number) =>
  clinicDate(new Date(Date.now() + days * 86_400_000));
