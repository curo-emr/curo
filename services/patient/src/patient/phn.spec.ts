import { generatePhn, luhnCheckDigit } from './phn';

/** Validates a whole number, check digit included: the inverse of `luhnCheckDigit`. */
function passesLuhn(digits: string): boolean {
  const sum = [...digits].reverse().reduce((total, char, i) => {
    const d = Number(char) * (i % 2 ? 2 : 1);
    return total + (d > 9 ? d - 9 : d);
  }, 0);
  return sum % 10 === 0;
}

describe('luhnCheckDigit', () => {
  it.each([
    ['7992739871', 3], // the standard worked example
    ['411111111111111', 1], // 4111 1111 1111 1111, the Visa test number
    ['20260000000', 6],
    ['0', 0],
  ])('gives %s the check digit %i', (payload, digit) => {
    expect(luhnCheckDigit(payload)).toBe(digit);
  });
});

describe('generatePhn', () => {
  it('is the year, a 7-digit sequence, then the check digit', () => {
    expect(generatePhn(2026, () => 0)).toBe('202600000006');
    expect(generatePhn(2026, () => 0.99)).toBe('202699999993');
  });

  it('always produces 12 digits that pass the Luhn check', () => {
    for (let i = 0; i < 200; i++) {
      const phn = generatePhn();
      expect(phn).toMatch(/^\d{12}$/);
      expect(passesLuhn(phn)).toBe(true);
    }
  });

  it('catches a mistyped digit', () => {
    const phn = generatePhn(2026, () => 0.5); // 202655555557
    const typo = phn.slice(0, 6) + '6' + phn.slice(7);
    expect(passesLuhn(phn)).toBe(true);
    expect(passesLuhn(typo)).toBe(false);
  });
});
