import {
  atClinicTime,
  clinicClock,
  clinicDate,
  clinicDayBounds,
} from './clinic-time';

describe('clinicDayBounds', () => {
  it("spans the clinic's day, not the UTC one", () => {
    expect(clinicDayBounds('2026-10-12', 'Asia/Colombo')).toEqual({
      start: new Date('2026-10-11T18:30:00.000Z'),
      end: new Date('2026-10-12T18:29:59.999Z'),
    });
  });

  it('keeps an early-morning appointment on its own day', () => {
    const { start, end } = clinicDayBounds('2026-10-12', 'Asia/Colombo')!;
    const twoAm = new Date('2026-10-11T20:30:00.000Z'); // 02:00 on the 12th in Colombo
    expect(twoAm >= start && twoAm <= end).toBe(true);
  });

  it('follows a change of clocks: a 23-hour day where summer time starts', () => {
    const { start, end } = clinicDayBounds('2026-03-29', 'Europe/London')!;
    expect(start.toISOString()).toBe('2026-03-29T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-29T22:59:59.999Z');
  });

  it('is null for anything but a real YYYY-MM-DD date', () => {
    for (const day of [
      'yesterday',
      '2026-02-30',
      '2026-10-12T00:00',
      '12/10/2026',
    ]) {
      expect(clinicDayBounds(day, 'Asia/Colombo')).toBeNull();
    }
  });
});

describe('atClinicTime', () => {
  it("is the instant the clinic's clocks show that time, not the server's", () => {
    expect(atClinicTime('2026-10-13', 8 * 60, 'Asia/Colombo')).toEqual(
      new Date('2026-10-13T02:30:00.000Z'),
    );
    expect(atClinicTime('2026-10-13', 8 * 60, 'UTC')).toEqual(
      new Date('2026-10-13T08:00:00.000Z'),
    );
  });

  it('follows a change of clocks', () => {
    // 10:00 BST, the day summer time starts in London.
    expect(atClinicTime('2026-03-29', 10 * 60, 'Europe/London')).toEqual(
      new Date('2026-03-29T09:00:00.000Z'),
    );
  });

  it('reads back as the same date and time on the clinic clock', () => {
    const instant = atClinicTime('2026-10-12', 16 * 60 + 15, 'Asia/Colombo');
    expect(clinicClock(instant, 'Asia/Colombo')).toMatchObject({
      date: '2026-10-12',
      minutes: 16 * 60 + 15,
    });
  });

  it('throws for anything but a real YYYY-MM-DD date', () => {
    expect(() => atClinicTime('2026-02-30', 0, 'Asia/Colombo')).toThrow(
      RangeError,
    );
    expect(() => atClinicTime('today', 0, 'Asia/Colombo')).toThrow(RangeError);
  });
});

describe('clinicDate', () => {
  it("is the clinic's date, which runs ahead of UTC's in the evening", () => {
    const evening = new Date('2026-10-11T19:00:00.000Z'); // 00:30 on the 12th in Colombo
    expect(clinicDate(evening, 'Asia/Colombo')).toBe('2026-10-12');
    expect(clinicDate(evening, 'UTC')).toBe('2026-10-11');
  });
});

describe('clinicClock', () => {
  it("reads the clinic's date, weekday and time of day, not UTC's", () => {
    const evening = new Date('2026-10-11T19:00:00.000Z'); // Monday 00:30 on the 12th in Colombo
    expect(clinicClock(evening, 'Asia/Colombo')).toEqual({
      date: '2026-10-12',
      weekday: 1,
      minutes: 30,
    });
    expect(clinicClock(evening, 'UTC')).toEqual({
      date: '2026-10-11',
      weekday: 0,
      minutes: 19 * 60,
    });
  });

  it('follows a change of clocks', () => {
    const afterChange = new Date('2026-03-29T09:00:00.000Z'); // 10:00 BST
    expect(clinicClock(afterChange, 'Europe/London').minutes).toBe(10 * 60);
  });
});
