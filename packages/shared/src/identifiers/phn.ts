/** Luhn (mod-10) check digit for a string of digits. */
export function luhnCheckDigit(digits: string): number {
  let sum = 0;
  let double = true; // the check digit will be appended, so the rightmost digit is doubled
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return (10 - (sum % 10)) % 10;
}

/** Personal Health Number: year (4) + random sequence (7) + Luhn check digit (1) = 12 digits. */
export function generatePhn(
  year = new Date().getFullYear(),
  random: () => number = Math.random,
): string {
  let payload = year.toString();
  for (let i = 0; i < 7; i++) payload += Math.floor(random() * 10).toString();
  return payload + luhnCheckDigit(payload).toString();
}
