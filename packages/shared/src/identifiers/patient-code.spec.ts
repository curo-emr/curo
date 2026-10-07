import { generatePatientCode } from './patient-code';

describe('generatePatientCode', () => {
  it('is CUR- and 8 letters or digits', () => {
    for (let i = 0; i < 100; i++)
      expect(generatePatientCode()).toMatch(/^CUR-[A-Z0-9]{8}$/);
  });

  it('draws every character from the whole alphabet', () => {
    expect(generatePatientCode(() => 0)).toBe('CUR-AAAAAAAA');
    expect(generatePatientCode(() => 0.999)).toBe('CUR-99999999');
  });
});
