import { intFromEnv } from './int-from-env';

describe('intFromEnv', () => {
  const NAME = 'CURO_TEST_INT';
  afterEach(() => delete process.env[NAME]);

  it('falls back when the variable is unset or blank', () => {
    expect(intFromEnv(NAME, 7)).toBe(7);
    process.env[NAME] = ' ';
    expect(intFromEnv(NAME, 7)).toBe(7);
  });

  it('reads a whole number', () => {
    process.env[NAME] = '2';
    expect(intFromEnv(NAME, 7)).toBe(2);
  });

  it.each(['abc', '1.5', '-1'])('refuses %p', (value) => {
    process.env[NAME] = value;
    expect(() => intFromEnv(NAME, 7)).toThrow(
      `${NAME} must be a whole number of at least 0`,
    );
  });

  it('refuses a number below the minimum', () => {
    process.env[NAME] = '0';
    expect(() => intFromEnv(NAME, 7, 1)).toThrow('at least 1');
  });
});
