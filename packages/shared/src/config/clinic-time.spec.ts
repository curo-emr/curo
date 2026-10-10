import { clinicDate, clinicDayBounds } from './clinic-time';

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

describe('clinicDate', () => {
  it("is the clinic's date, which runs ahead of UTC's in the evening", () => {
    const evening = new Date('2026-10-11T19:00:00.000Z'); // 00:30 on the 12th in Colombo
    expect(clinicDate(evening, 'Asia/Colombo')).toBe('2026-10-12');
    expect(clinicDate(evening, 'UTC')).toBe('2026-10-11');
  });
});
