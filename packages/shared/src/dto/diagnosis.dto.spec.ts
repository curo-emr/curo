import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { DiagnosisDto } from './diagnosis.dto';

describe('DiagnosisDto', () => {
  const problems = (body: object) =>
    validateSync(plainToInstance(DiagnosisDto, body)).map((e) => e.property);

  it('takes a diagnosis without a code, or with a blank one', () => {
    expect(problems({ display: 'Tension headache' })).toEqual([]);
    expect(problems({ display: 'Tension headache', code: ' ' })).toEqual([]);
  });

  it('takes a well-formed code, however it is typed', () => {
    for (const code of ['r51.9', 'R519', 'qa00101'])
      expect(problems({ display: 'Headache', code })).toEqual([]);
  });

  it('turns away a code that is not ICD-10, and a blank diagnosis', () => {
    expect(problems({ display: 'Headache', code: 'headache' })).toEqual([
      'code',
    ]);
    expect(problems({ display: '  ', code: 'R51.9' })).toEqual(['display']);
  });
});
