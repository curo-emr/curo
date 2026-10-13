import { ICD10_CODE, tidyIcd10Code } from '.';

describe('tidyIcd10Code', () => {
  it.each([
    ['R51.9', 'R51.9'],
    [' r519 ', 'R51.9'],
    ['i10', 'I10'],
    ['S72001A', 'S72.001A'],
    ['QA00101', 'QA0.0101'],
    ['   ', ''],
  ])('reads %p as %p', (code, tidy) => {
    expect(tidyIcd10Code(code)).toBe(tidy);
  });
});

describe('ICD10_CODE', () => {
  it('matches codes whose category has letters after the first', () => {
    for (const code of ['I10', 'R51.9', 'M1A.0', 'QA0.0101', 'S72.001A'])
      expect(code).toMatch(ICD10_CODE);
  });

  it('turns away words and malformed codes', () => {
    for (const code of ['headache', '51.9', 'R5', 'R51.12345', 'r51.9'])
      expect(code).not.toMatch(ICD10_CODE);
  });
});
