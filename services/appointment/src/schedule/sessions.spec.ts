import {
  bookingProblem,
  sessionProblem,
  weekChange,
  type Session,
} from './sessions';

describe('sessionProblem', () => {
  it('accepts sessions that meet end to end, and the same hours on other days', () => {
    expect(
      sessionProblem([
        { weekday: 1, start: '09:00', end: '12:00' },
        { weekday: 1, start: '12:00', end: '13:00' },
        { weekday: 2, start: '09:00', end: '12:00' },
      ]),
    ).toBeNull();
  });

  it('names two sessions on one day that overlap, in any order', () => {
    expect(
      sessionProblem([
        { weekday: 1, start: '11:00', end: '13:00' },
        { weekday: 1, start: '09:00', end: '12:00' },
      ]),
    ).toBe('Monday 09:00–12:00 overlaps 11:00–13:00');
  });

  it('names a session that ends before it starts', () => {
    expect(sessionProblem([{ weekday: 0, start: '18:00', end: '16:00' }])).toBe(
      'Sunday 18:00–16:00 must end after it starts',
    );
  });
});

describe('weekChange', () => {
  const monday: Session = {
    weekday: 1,
    start: '08:00',
    end: '12:00',
    slotMinutes: 15,
    room: '1',
  };
  const friday: Session = {
    ...monday,
    weekday: 5,
    start: '16:00',
    end: '19:00',
  };
  const saturday: Session = { ...monday, weekday: 6 };

  it('is null when the week is the same', () => {
    expect(
      weekChange([monday, friday], [{ ...monday }, { ...friday }]),
    ).toBeNull();
  });

  it('names the sessions added, removed and changed', () => {
    expect(
      weekChange([monday, friday], [{ ...monday, room: '2' }, saturday]),
    ).toBe(
      'added Saturday 08:00–12:00; removed Friday 16:00–19:00; changed Monday 08:00–12:00',
    );
  });

  it('counts a session moved to other hours as removed and added', () => {
    expect(weekChange([monday], [{ ...monday, start: '09:00' }])).toBe(
      'added Monday 09:00–12:00; removed Monday 08:00–12:00',
    );
  });

  it('names every session of a week set from nothing, or cleared', () => {
    expect(weekChange([], [monday, friday])).toBe(
      'added Monday 08:00–12:00, Friday 16:00–19:00',
    );
    expect(weekChange([monday], [])).toBe('removed Monday 08:00–12:00');
  });
});

describe('bookingProblem', () => {
  // Mondays 09:00–12:00; it's 08:00 on Monday 12 October 2026 in Colombo.
  const mondayMornings = [{ weekday: 1, start: '09:00', end: '12:00' }];
  const now = new Date('2026-10-12T08:00:00+05:30');
  const at = (time: string, day = '2026-10-12') =>
    new Date(`${day}T${time}:00+05:30`);
  const problem = (start: string, end: string, day?: string) =>
    bookingProblem(
      at(start, day),
      at(end, day),
      mondayMornings,
      now,
      'Asia/Colombo',
    );

  it("accepts a time within a session, to the session's last minute", () => {
    expect(problem('09:00', '09:15')).toBeNull();
    expect(problem('11:45', '12:00')).toBeNull();
    expect(problem('09:00', '09:15', '2026-10-19')).toBeNull();
  });

  it("refuses a time outside the doctor's sessions, or running past one's end", () => {
    for (const [start, end, day] of [
      ['02:00', '02:15', '2026-10-19'],
      ['08:45', '09:00'],
      ['11:50', '12:05'],
      ['09:00', '09:15', '2026-10-13'],
    ]) {
      expect(problem(start, end, day)).toMatch(
        /doesn't see patients at that time/,
      );
    }
  });

  it("reads the session on the clinic's clock, not UTC's", () => {
    // 09:00 in Colombo is 03:30 UTC.
    expect(
      bookingProblem(
        new Date('2026-10-12T03:30:00Z'),
        new Date('2026-10-12T03:45:00Z'),
        mondayMornings,
        now,
        'Asia/Colombo',
      ),
    ).toBeNull();
  });

  it('refuses a time that is over, but not a slot still under way', () => {
    expect(problem('09:00', '09:15', '2021-03-01')).toMatch(/already passed/);
    const later = new Date('2026-10-12T09:10:00+05:30');
    expect(
      bookingProblem(
        at('09:00'),
        at('09:15'),
        mondayMornings,
        later,
        'Asia/Colombo',
      ),
    ).toBeNull();
    expect(
      bookingProblem(
        at('08:45'),
        at('09:10'),
        mondayMornings,
        later,
        'Asia/Colombo',
      ),
    ).toMatch(/already passed/);
  });

  it('refuses a time that ends before it starts', () => {
    expect(problem('10:00', '09:45')).toBe(
      'An appointment must end after it starts',
    );
  });
});
