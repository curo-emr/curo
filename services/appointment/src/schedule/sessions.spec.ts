import { sessionProblem } from './sessions';

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
