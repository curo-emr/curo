import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { DiagnosisDto, toIcd10Code } from './diagnosis.dto';

describe('toIcd10Code', () => {
  it.each([
    ['R51.9', 'R51.9'],
    [' r519 ', 'R51.9'],
    ['i10', 'I10'],
    ['S72001A', 'S72.001A'],
    ['', null],
    ['   ', null],
  ])('reads %p as %p', (input, code) => {
    expect(toIcd10Code(input)).toBe(code);
  });
});

describe('DiagnosisDto', () => {
  const problems = (body: object) =>
    validateSync(plainToInstance(DiagnosisDto, body)).map((e) => e.property);

  it('takes a diagnosis without a code, or with a blank one', () => {
    expect(problems({ display: 'Tension headache' })).toEqual([]);
    expect(problems({ display: 'Tension headache', code: ' ' })).toEqual([]);
  });

  it('takes a well-formed code', () => {
    expect(problems({ display: 'Headache', code: 'r51.9' })).toEqual([]);
  });

  it('turns away a code that is not ICD-10, and a blank diagnosis', () => {
    expect(problems({ display: 'Headache', code: 'headache' })).toEqual([
      'code',
    ]);
    expect(problems({ display: '  ', code: 'R51.9' })).toEqual(['display']);
  });
});
