import type { DataSource } from 'typeorm';
import * as QRCode from 'qrcode';
// Imported from source: the seed image is built without the workspaces.
import { labSampleUrl } from '../packages/shared/src/lab/lab-qr';

// The labs' test catalog, and lab orders for the seeded visits, built from one
// list of tests so the catalog, the orders and their reports always agree.

/** A value a test reports, and the range a normal result falls in. */
interface Analyte {
  code: string; // LOINC
  display: string;
  unit: string;
  low: number;
  high: number;
}

/** A test the labs offer and doctors order, with the values it reports. */
interface LabTest {
  code: string; // LOINC
  name: string;
  category: string;
  specimen: string;
  price: number;
  analytes: Analyte[];
}

const LAB_TESTS: LabTest[] = [
  {
    code: '58410-2',
    name: 'Full Blood Count',
    category: 'Hematology',
    specimen: 'Whole Blood',
    price: 900,
    analytes: [
      { code: '718-7', display: 'Hemoglobin', unit: 'g/dL', low: 12, high: 16 },
      {
        code: '6690-2',
        display: 'White Blood Cells',
        unit: '10^3/µL',
        low: 4,
        high: 11,
      },
      {
        code: '777-3',
        display: 'Platelets',
        unit: '10^3/µL',
        low: 150,
        high: 400,
      },
    ],
  },
  {
    code: '2345-7',
    name: 'Glucose (Fasting)',
    category: 'Biochemistry',
    specimen: 'Serum',
    price: 250,
    analytes: [
      {
        code: '2345-7',
        display: 'Glucose (Fasting)',
        unit: 'mg/dL',
        low: 70,
        high: 100,
      },
    ],
  },
  {
    code: '17856-6',
    name: 'HbA1c',
    category: 'Biochemistry',
    specimen: 'Whole Blood',
    price: 1200,
    analytes: [
      { code: '4548-4', display: 'HbA1c', unit: '%', low: 4, high: 5.6 },
    ],
  },
  {
    code: '24331-1',
    name: 'Lipid Panel',
    category: 'Biochemistry',
    specimen: 'Serum',
    price: 1500,
    analytes: [
      {
        code: '2093-3',
        display: 'Total Cholesterol',
        unit: 'mg/dL',
        low: 125,
        high: 200,
      },
      {
        code: '2085-9',
        display: 'HDL Cholesterol',
        unit: 'mg/dL',
        low: 40,
        high: 60,
      },
      {
        code: '13457-7',
        display: 'LDL Cholesterol',
        unit: 'mg/dL',
        low: 50,
        high: 100,
      },
      {
        code: '2571-8',
        display: 'Triglycerides',
        unit: 'mg/dL',
        low: 50,
        high: 150,
      },
    ],
  },
  {
    code: '24362-6',
    name: 'Renal Function Panel',
    category: 'Biochemistry',
    specimen: 'Serum',
    price: 1100,
    analytes: [
      {
        code: '2160-0',
        display: 'Creatinine',
        unit: 'mg/dL',
        low: 0.6,
        high: 1.2,
      },
      {
        code: '6299-2',
        display: 'Blood Urea Nitrogen',
        unit: 'mg/dL',
        low: 7,
        high: 20,
      },
    ],
  },
  {
    code: '24325-3',
    name: 'Liver Function Panel',
    category: 'Biochemistry',
    specimen: 'Serum',
    price: 1800,
    analytes: [
      { code: '1742-6', display: 'ALT', unit: 'U/L', low: 7, high: 56 },
      { code: '1920-8', display: 'AST', unit: 'U/L', low: 10, high: 40 },
    ],
  },
  {
    code: '3016-3',
    name: 'Thyroid Stimulating Hormone (TSH)',
    category: 'Endocrinology',
    specimen: 'Serum',
    price: 1600,
    analytes: [
      { code: '3016-3', display: 'TSH', unit: 'mIU/L', low: 0.4, high: 4 },
    ],
  },
  {
    code: '5902-2',
    name: 'Prothrombin Time (PT)',
    category: 'Hematology',
    specimen: 'Citrated Plasma',
    price: 700,
    analytes: [
      {
        code: '5902-2',
        display: 'Prothrombin Time',
        unit: 's',
        low: 11,
        high: 13.5,
      },
    ],
  },
];

// The Colombo lab offers every test; the Galle lab only these.
const GALLE_TESTS = new Set(['58410-2', '2345-7', '24331-1', '24362-6']);

type Stage = 'sent' | 'received' | 'reported';

// One test ordered at each seeded visit, in visit order (newest first): which
// test, whether it went to Galle rather than Colombo, and how far it has got.
const VISIT_ORDERS: {
  test: string;
  galle?: boolean;
  stage: Stage;
  urgent?: boolean;
}[] = [
  { test: '2345-7', galle: true, stage: 'sent' },
  { test: '5902-2', stage: 'sent', urgent: true },
  { test: '58410-2', galle: true, stage: 'received' },
  { test: '3016-3', stage: 'received' },
  { test: '24325-3', stage: 'reported' },
  { test: '24362-6', galle: true, stage: 'reported' },
  { test: '24331-1', galle: true, stage: 'reported' },
  { test: '17856-6', stage: 'reported' },
  { test: '2345-7', stage: 'reported' },
  { test: '58410-2', stage: 'reported' },
];

export interface SeededLabs {
  colombo: string;
  galle: string;
  /** The technician working at each lab, by lab id. */
  technicianAt: Record<string, string>;
}

/** Each lab's catalog: Colombo offers every test, Galle a subset. */
export async function seedLabCatalog(db: DataSource, labs: SeededLabs) {
  let count = 0;
  for (const labId of [labs.colombo, labs.galle]) {
    const offered = LAB_TESTS.filter(
      (t) => labId === labs.colombo || GALLE_TESTS.has(t.code),
    );
    for (const t of offered) {
      await db.query(
        `INSERT INTO lab_test_catalog ("organizationId", code, name, category, specimen, price, active)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [labId, t.code, t.name, t.category, t.specimen, t.price],
      );
      count++;
    }
  }
  console.log(`✅ ${count} lab catalog tests created`);
}

// Where each reported value sits in its range: 0 is the low end, 1 the high
// end. A few fall outside, so some results are flagged.
const VALUE_POSITIONS = [
  0.45, 0.6, 1.3, 0.35, 0.55, 0.7, -0.25, 0.5, 0.4, 1.15,
];

function reportedValue(a: Analyte, n: number): number {
  const p = VALUE_POSITIONS[n % VALUE_POSITIONS.length];
  const value = a.low + (a.high - a.low) * p;
  const decimals = a.high >= 50 ? 0 : a.high >= 5 ? 1 : 2;
  return Number(value.toFixed(decimals));
}

const interpretation = (a: Analyte, value: number) =>
  value > a.high ? 'H' : value < a.low ? 'L' : 'N';

const hoursAfter = (d: Date, hours: number) =>
  new Date(d.getTime() + hours * 3_600_000);

/**
 * A lab order for each seeded visit, as a doctor would place it: one test,
 * sent to a lab that offers it, with its sample label. Reported orders have
 * their results, as the lab enters them: observations and a final report by
 * that lab's technician.
 */
export async function seedLabOrders(
  db: DataSource,
  labs: SeededLabs,
  encounterIds: string[],
) {
  const visits = await db.query<
    {
      id: string;
      patientId: string;
      practitionerId: string;
      periodStart: Date;
    }[]
  >(
    `SELECT id, "patientId", "practitionerId", "periodStart" FROM encounters
     WHERE id = ANY($1) ORDER BY "periodStart" DESC`,
    [encounterIds],
  );

  let analyteCount = 0;
  for (const [i, visit] of visits.entries()) {
    const plan = VISIT_ORDERS[i % VISIT_ORDERS.length];
    const test = LAB_TESTS.find((t) => t.code === plan.test);
    if (!test) throw new Error(`Seeded order for unknown test ${plan.test}`);
    if (plan.galle && !GALLE_TESTS.has(test.code))
      throw new Error(`The Galle lab does not offer ${test.name}`);
    const labId = plan.galle ? labs.galle : labs.colombo;
    const technician = labs.technicianAt[labId];

    const ordered = hoursAfter(visit.periodStart, 0.25);
    const received = plan.stage === 'sent' ? null : hoursAfter(ordered, 1);
    const reported = plan.stage === 'reported' ? hoursAfter(ordered, 6) : null;

    const [order] = await db.query<{ id: string }[]>(
      `INSERT INTO service_requests
         ("patientId", "requesterId", "encounterId", "performerOrganizationId", "performerId",
          status, intent, category, code, display, priority, "authoredOn", "receivedAt", "completedAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'order', 'laboratory', $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        visit.patientId,
        visit.practitionerId,
        visit.id,
        labId,
        received ? technician : null,
        reported ? 'completed' : 'active',
        test.code,
        test.name,
        plan.urgent ? 'urgent' : 'routine',
        ordered,
        received,
        reported,
      ],
    );

    const encodedUrl = labSampleUrl(order.id);
    const [qr] = await db.query<{ id: string }[]>(
      `INSERT INTO qr_codes ("serviceRequestId", "encodedUrl", "imageBase64", "scannedAt", "scannedBy")
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        order.id,
        encodedUrl,
        await QRCode.toDataURL(encodedUrl),
        received,
        received ? technician : null,
      ],
    );
    await db.query(
      `UPDATE service_requests SET "qrCodeId" = $1 WHERE id = $2`,
      [qr.id, order.id],
    );

    if (!reported) continue;
    const results = test.analytes.map((a) => {
      const value = reportedValue(a, analyteCount++);
      return {
        code: a.code,
        display: a.display,
        value,
        unit: a.unit,
        referenceRangeLow: String(a.low),
        referenceRangeHigh: String(a.high),
        interpretation: interpretation(a, value),
      };
    });
    for (const r of results)
      await db.query(
        `INSERT INTO observations
           ("patientId", "practitionerId", "serviceRequestId", status, category, code, display,
            "valueQuantity", "valueUnit", interpretation, "referenceRangeLow", "referenceRangeHigh", "effectiveDateTime")
         VALUES ($1, $2, $3, 'final', 'laboratory', $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          visit.patientId,
          technician,
          order.id,
          r.code,
          r.display,
          r.value,
          r.unit,
          r.interpretation,
          r.referenceRangeLow,
          r.referenceRangeHigh,
          reported,
        ],
      );
    const flagged = results.filter((r) => r.interpretation !== 'N');
    await db.query(
      `INSERT INTO diagnostic_reports
         ("patientId", "serviceRequestId", "performerId", status, code, display, results, conclusion, "effectiveDateTime", issued)
       VALUES ($1, $2, $3, 'final', $4, $5, $6, $7, $8, $8)`,
      [
        visit.patientId,
        order.id,
        technician,
        test.code,
        test.name,
        JSON.stringify(results),
        flagged.length
          ? `${flagged.map((r) => r.display).join(', ')} outside the reference range.`
          : 'All results within the reference range.',
        reported,
      ],
    );
  }
  console.log(`✅ ${visits.length} lab orders created, one per seeded visit`);
}
