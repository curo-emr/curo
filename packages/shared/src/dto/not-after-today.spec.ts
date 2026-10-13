import { validateSync } from 'class-validator';
import { clinicDate } from '../config/clinic-time';
import { IsNotAfterToday } from './not-after-today';

class Born {
  @IsNotAfterToday()
  birthDate: string;
}

const errorsFor = (birthDate: string) =>
  validateSync(Object.assign(new Born(), { birthDate }));

/** `days` from today on the clinic's calendar, as YYYY-MM-DD. */
const daysFromToday = (days: number) =>
  clinicDate(new Date(Date.now() + days * 86_400_000));

describe('IsNotAfterToday', () => {
  it('takes today and earlier days, as a date or a date-time', () => {
    for (const date of [
      daysFromToday(0),
      daysFromToday(-1),
      '1950-01-01T00:00:00Z',
    ])
      expect(errorsFor(date)).toEqual([]);
  });

  it('leaves a value that is not a date to @IsDateString', () => {
    expect(errorsFor('not-a-date')).toEqual([]);
  });

  it('refuses tomorrow and later, naming the field', () => {
    for (const date of [daysFromToday(1), '2999-05-05T00:00:00Z']) {
      const [error] = errorsFor(date);
      expect(error.constraints).toEqual({
        isNotAfterToday: "birthDate can't be after today",
      });
    }
  });
});
