import { sessionProblem, weekChange, type Session } from './sessions';

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
