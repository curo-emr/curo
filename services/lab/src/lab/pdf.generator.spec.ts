import { generateLabReportPdf } from './pdf.generator';

const report: Parameters<typeof generateLabReportPdf>[0] = {
  patientName: 'Test Patient',
  patientCode: 'PHN-0000000001',
  birthDate: '1990-01-01',
  testName: 'Full Blood Count',
  results: [
    {
      code: '718-7',
      display: 'Haemoglobin',
      value: 9.1,
      unit: 'g/dL',
      referenceRangeLow: '12',
      referenceRangeHigh: '16',
      interpretation: 'L',
    },
    {
      code: '6690-2',
      display: 'White cell count',
      value: 14.2,
      unit: '10*3/uL',
      referenceRangeText: '4.0 - 11.0',
      interpretation: 'HH',
    },
    { code: '5778-6', display: 'Colour', valueString: 'Yellow' },
  ],
  conclusion: 'Anaemia with leucocytosis.',
  labStaffName: 'Lab Staff',
  clinicName: 'Curo Central Clinic',
  reportDate: '2026-10-08',
};

const pdfOf = async (data: typeof report) =>
  Buffer.from(await generateLabReportPdf(data), 'base64').toString('latin1');

describe('generateLabReportPdf', () => {
  it('renders a complete one-page PDF', async () => {
    const pdf = await pdfOf(report);

    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(pdf.match(/\/Type \/Page\b(?!s)/g)).toHaveLength(1);
  });

  it('embeds the standard fonts the report is set in', async () => {
    const pdf = await pdfOf(report);

    expect(pdf).toContain('/BaseFont /Helvetica\n');
    expect(pdf).toContain('/BaseFont /Helvetica-Bold\n');
  });

  it('renders a report without results or a conclusion', async () => {
    const pdf = await pdfOf({ ...report, results: [], conclusion: undefined });

    expect(pdf.startsWith('%PDF-')).toBe(true);
  });
});
