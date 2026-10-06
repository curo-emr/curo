// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

interface ReportData {
  patientName: string;
  patientCode: string;
  birthDate: string;
  testName: string;
  results: Array<{
    display: string;
    value?: number;
    unit?: string;
    valueString?: string;
    referenceRangeLow?: string;
    referenceRangeHigh?: string;
    referenceRangeText?: string;
    interpretation?: string;
  }>;
  conclusion?: string;
  labStaffName: string;
  clinicName: string;
  reportDate: string;
}

export async function generateLabReportPdf(data: ReportData): Promise<string> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
    doc.on('error', reject);

    // Header
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(data.clinicName, { align: 'center' });
    doc
      .fontSize(14)
      .font('Helvetica')
      .text('Laboratory Report', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Patient info
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Patient Information', { underline: true });
    doc.moveDown(0.3);
    doc
      .font('Helvetica')
      .text(`Name: ${data.patientName}`, { continued: true })
      .text(`   Code: ${data.patientCode}`, { align: 'right' });
    doc
      .text(`Date of Birth: ${data.birthDate}`, { continued: true })
      .text(`   Report Date: ${data.reportDate}`, { align: 'right' });
    doc.moveDown();

    // Test name
    doc
      .font('Helvetica-Bold')
      .text('Test: ', { continued: true })
      .font('Helvetica')
      .text(data.testName);
    doc.moveDown();

    // Results table header
    doc.font('Helvetica-Bold').text('Results:', { underline: true });
    doc.moveDown(0.3);

    const tableTop = doc.y;
    const col1 = 50,
      col2 = 200,
      col3 = 280,
      col4 = 360,
      col5 = 440;
    const rowHeight = 20;

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Test', col1, tableTop);
    doc.text('Result', col2, tableTop);
    doc.text('Unit', col3, tableTop);
    doc.text('Ref Range', col4, tableTop);
    doc.text('Flag', col5, tableTop);
    doc
      .moveTo(50, tableTop + rowHeight - 2)
      .lineTo(550, tableTop + rowHeight - 2)
      .stroke();

    doc.font('Helvetica').fontSize(10);
    let y = tableTop + rowHeight;

    for (const r of data.results) {
      const resultText = r.value != null ? `${r.value}` : r.valueString || '--';
      const refRange =
        r.referenceRangeText ||
        (r.referenceRangeLow && r.referenceRangeHigh
          ? `${r.referenceRangeLow} - ${r.referenceRangeHigh}`
          : '--');
      const flag = r.interpretation || '';

      if (flag === 'H' || flag === 'HH') {
        doc.fillColor('red');
      } else if (flag === 'L' || flag === 'LL') {
        doc.fillColor('blue');
      } else {
        doc.fillColor('black');
      }

      doc.text(r.display, col1, y, { width: 140 });
      doc.text(resultText, col2, y, { width: 70 });
      doc.text(r.unit || '--', col3, y, { width: 70 });
      doc.text(refRange, col4, y, { width: 70 });
      doc.text(flag, col5, y, { width: 50 });
      doc.fillColor('black');
      y += rowHeight;
    }

    doc.moveDown(2);
    doc.y = y + 10;

    if (data.conclusion) {
      doc.font('Helvetica-Bold').text('Conclusion / Interpretation:');
      doc.font('Helvetica').text(data.conclusion);
      doc.moveDown();
    }

    // Footer
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .text(`Reported by: ${data.labStaffName}`, { align: 'right' });
    doc
      .fillColor('grey')
      .text(
        `This report is generated electronically and is valid without signature.`,
        { align: 'center' },
      );
    doc.fillColor('black');

    doc.end();
  });
}
