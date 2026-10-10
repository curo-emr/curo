import type { DataSource } from 'typeorm';

// The one list of drugs. Doctors prescribe from the catalog and pharmacies keep
// stock under the same codes, so whatever is prescribed can be found on a shelf.

/** A drug in the prescribing catalog. */
interface Drug {
  id: string;
  name: string;
  genericName: string;
  form: string;
  strength: string;
  atc: string;
  commonSubstitutes?: string[];
}

// Ids are grouped by area: 01 diabetes, 02 respiratory, 03 cardiovascular,
// 04 stomach, 05 pain, 06 infection, 07 allergy, 08 supplements.
const MEDICATION_CATALOG: Drug[] = [
  {
    id: 'med_0101',
    name: 'Metformin 500mg Tablet',
    genericName: 'Metformin',
    form: 'tablet',
    strength: '500mg',
    atc: 'A10BA02',
    commonSubstitutes: ['med_0102'],
  },
  {
    id: 'med_0102',
    name: 'Metformin 850mg Tablet',
    genericName: 'Metformin',
    form: 'tablet',
    strength: '850mg',
    atc: 'A10BA02',
    commonSubstitutes: ['med_0101'],
  },
  {
    id: 'med_0103',
    name: 'Insulin Glargine 100U/ml Injection',
    genericName: 'Insulin Glargine',
    form: 'injection',
    strength: '100U/ml',
    atc: 'A10AE04',
  },
  {
    id: 'med_0201',
    name: 'Salbutamol Inhaler 100mcg',
    genericName: 'Salbutamol',
    form: 'inhaler',
    strength: '100mcg',
    atc: 'R03AC02',
    commonSubstitutes: ['med_0202'],
  },
  {
    id: 'med_0202',
    name: 'Levosalbutamol Inhaler 50mcg',
    genericName: 'Levosalbutamol',
    form: 'inhaler',
    strength: '50mcg',
    atc: 'R03CC13',
    commonSubstitutes: ['med_0201'],
  },
  {
    id: 'med_0301',
    name: 'Amlodipine 5mg Tablet',
    genericName: 'Amlodipine',
    form: 'tablet',
    strength: '5mg',
    atc: 'C08CA01',
  },
  {
    id: 'med_0302',
    name: 'Atorvastatin 20mg Tablet',
    genericName: 'Atorvastatin',
    form: 'tablet',
    strength: '20mg',
    atc: 'C10AA05',
    commonSubstitutes: ['med_0303'],
  },
  {
    id: 'med_0303',
    name: 'Simvastatin 20mg Tablet',
    genericName: 'Simvastatin',
    form: 'tablet',
    strength: '20mg',
    atc: 'C10AA01',
    commonSubstitutes: ['med_0302'],
  },
  {
    id: 'med_0304',
    name: 'Losartan 50mg Tablet',
    genericName: 'Losartan',
    form: 'tablet',
    strength: '50mg',
    atc: 'C09CA01',
  },
  {
    id: 'med_0305',
    name: 'Lisinopril 10mg Tablet',
    genericName: 'Lisinopril',
    form: 'tablet',
    strength: '10mg',
    atc: 'C09AA03',
  },
  {
    id: 'med_0306',
    name: 'Metoprolol 50mg Tablet',
    genericName: 'Metoprolol',
    form: 'tablet',
    strength: '50mg',
    atc: 'C07AB02',
  },
  {
    id: 'med_0307',
    name: 'Furosemide 40mg Tablet',
    genericName: 'Furosemide',
    form: 'tablet',
    strength: '40mg',
    atc: 'C03CA01',
  },
  {
    id: 'med_0308',
    name: 'Aspirin 75mg Tablet',
    genericName: 'Aspirin',
    form: 'tablet',
    strength: '75mg',
    atc: 'B01AC06',
  },
  {
    id: 'med_0309',
    name: 'Clopidogrel 75mg Tablet',
    genericName: 'Clopidogrel',
    form: 'tablet',
    strength: '75mg',
    atc: 'B01AC04',
  },
  {
    id: 'med_0401',
    name: 'Omeprazole 20mg Capsule',
    genericName: 'Omeprazole',
    form: 'capsule',
    strength: '20mg',
    atc: 'A02BC01',
    commonSubstitutes: ['med_0402'],
  },
  {
    id: 'med_0402',
    name: 'Pantoprazole 40mg Tablet',
    genericName: 'Pantoprazole',
    form: 'tablet',
    strength: '40mg',
    atc: 'A02BC02',
    commonSubstitutes: ['med_0401'],
  },
  {
    id: 'med_0501',
    name: 'Paracetamol 500mg Tablet',
    genericName: 'Paracetamol',
    form: 'tablet',
    strength: '500mg',
    atc: 'N02BE01',
  },
  {
    id: 'med_0502',
    name: 'Diclofenac 50mg Tablet',
    genericName: 'Diclofenac',
    form: 'tablet',
    strength: '50mg',
    atc: 'M01AB05',
  },
  {
    id: 'med_0601',
    name: 'Amoxicillin 250mg Capsule',
    genericName: 'Amoxicillin',
    form: 'capsule',
    strength: '250mg',
    atc: 'J01CA04',
  },
  {
    id: 'med_0602',
    name: 'Azithromycin 500mg Tablet',
    genericName: 'Azithromycin',
    form: 'tablet',
    strength: '500mg',
    atc: 'J01FA10',
  },
  {
    id: 'med_0701',
    name: 'Cetirizine 10mg Tablet',
    genericName: 'Cetirizine',
    form: 'tablet',
    strength: '10mg',
    atc: 'R06AE07',
  },
  {
    id: 'med_0801',
    name: 'Vitamin D3 1000IU Capsule',
    genericName: 'Cholecalciferol',
    form: 'capsule',
    strength: '1000IU',
    atc: 'A11CC05',
  },
];

/** The catalog drug with this id; a typo in the seed fails loudly. */
export function drug(id: string): Drug {
  const found = MEDICATION_CATALOG.find((d) => d.id === id);
  if (!found) throw new Error(`No catalog drug ${id}`);
  return found;
}

/**
 * The codes stock, prescriptions and dispenses were seeded with before they
 * shared the catalog's, and the catalog drug each one is.
 */
const FORMER_CODES: Record<string, string> = {
  'metformin-500mg': 'med_0101',
  'insulin-glargine': 'med_0103',
  'salbutamol-inhaler': 'med_0201',
  'amlodipine-5mg': 'med_0301',
  'atorvastatin-20mg': 'med_0302',
  'simvastatin-20mg': 'med_0303',
  'losartan-50mg': 'med_0304',
  'lisinopril-10mg': 'med_0305',
  'metoprolol-50mg': 'med_0306',
  'furosemide-40mg': 'med_0307',
  'aspirin-75mg': 'med_0308',
  'clopidogrel-75mg': 'med_0309',
  'omeprazole-20mg': 'med_0401',
  'pantoprazole-40mg': 'med_0402',
  'paracetamol-500mg': 'med_0501',
  'diclofenac-50mg': 'med_0502',
  'amoxicillin-250mg': 'med_0601',
  'azithromycin-500mg': 'med_0602',
  'cetirizine-10mg': 'med_0701',
  'vitamin-d3': 'med_0801',
};

/**
 * Adds any catalog drug the database lacks, then moves data seeded under the
 * former codes onto the catalog's. Safe to re-run.
 */
export async function ensureMedicationCatalog(db: DataSource) {
  for (const m of MEDICATION_CATALOG) {
    await db.query(
      `INSERT INTO medication_catalog (id, name, "genericName", form, strength, atc, "commonSubstitutes", active)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true)
       ON CONFLICT (id) DO NOTHING`,
      [
        m.id,
        m.name,
        m.genericName,
        m.form,
        m.strength,
        m.atc,
        JSON.stringify(m.commonSubstitutes ?? []),
      ],
    );
  }
  console.log(
    `✅ ${MEDICATION_CATALOG.length} medication catalog entries ensured`,
  );

  const former = [Object.keys(FORMER_CODES), Object.values(FORMER_CODES)];
  // Stock also takes the catalog's names, so the shelf and the prescription agree.
  await db.query(
    `UPDATE stock s
     SET "medicationCode" = c.id, "medicationName" = c.name,
         "genericName" = c."genericName", form = c.form, strength = c.strength
     FROM unnest($1::text[], $2::text[]) AS f(code, id)
     JOIN medication_catalog c ON c.id = f.id
     WHERE s."medicationCode" = f.code`,
    former,
  );
  for (const table of ['medication_requests', 'medication_dispenses']) {
    await db.query(
      `UPDATE ${table} t SET "medicationCode" = f.id
       FROM unnest($1::text[], $2::text[]) AS f(code, id)
       WHERE t."medicationCode" = f.code`,
      former,
    );
  }
  console.log('✅ stock and prescriptions use the catalog codes');
}

/** A batch received into a pharmacy. */
interface SeedBatch {
  drug: string;
  qty: number;
  unit: string;
  expiry: string;
  threshold: number;
  price: number;
}

// The Colombo pharmacy's stock. Some batches are low or expired on purpose.
const STOCK: SeedBatch[] = [
  {
    drug: 'med_0101',
    qty: 500,
    unit: 'tablets',
    expiry: '2026-12-31',
    threshold: 50,
    price: 5.5,
  },
  {
    drug: 'med_0301',
    qty: 300,
    unit: 'tablets',
    expiry: '2026-12-31',
    threshold: 30,
    price: 12.0,
  },
  {
    drug: 'med_0302',
    qty: 200,
    unit: 'tablets',
    expiry: '2027-06-30',
    threshold: 30,
    price: 18.5,
  },
  {
    drug: 'med_0401',
    qty: 250,
    unit: 'capsules',
    expiry: '2026-09-30',
    threshold: 25,
    price: 8.0,
  },
  {
    drug: 'med_0201',
    qty: 40,
    unit: 'inhalers',
    expiry: '2026-08-31',
    threshold: 5,
    price: 320.0,
  },
  {
    drug: 'med_0304',
    qty: 150,
    unit: 'tablets',
    expiry: '2027-01-31',
    threshold: 20,
    price: 15.0,
  },
  {
    drug: 'med_0501',
    qty: 1000,
    unit: 'tablets',
    expiry: '2027-03-31',
    threshold: 100,
    price: 3.0,
  },
  {
    drug: 'med_0601',
    qty: 8,
    unit: 'capsules',
    expiry: '2026-05-31',
    threshold: 30,
    price: 22.0,
  },
  {
    drug: 'med_0701',
    qty: 100,
    unit: 'tablets',
    expiry: '2027-02-28',
    threshold: 20,
    price: 6.5,
  },
  {
    drug: 'med_0402',
    qty: 5,
    unit: 'tablets',
    expiry: '2025-12-31',
    threshold: 20,
    price: 14.0,
  },
  {
    drug: 'med_0306',
    qty: 120,
    unit: 'tablets',
    expiry: '2026-11-30',
    threshold: 20,
    price: 11.0,
  },
  {
    drug: 'med_0308',
    qty: 600,
    unit: 'tablets',
    expiry: '2027-06-30',
    threshold: 50,
    price: 4.0,
  },
  {
    drug: 'med_0502',
    qty: 80,
    unit: 'tablets',
    expiry: '2026-10-31',
    threshold: 15,
    price: 9.0,
  },
  {
    drug: 'med_0307',
    qty: 3,
    unit: 'tablets',
    expiry: '2026-07-31',
    threshold: 30,
    price: 7.0,
  },
  {
    drug: 'med_0801',
    qty: 200,
    unit: 'capsules',
    expiry: '2027-12-31',
    threshold: 30,
    price: 25.0,
  },
  {
    drug: 'med_0103',
    qty: 25,
    unit: 'vials',
    expiry: '2026-06-30',
    threshold: 5,
    price: 1800.0,
  },
  {
    drug: 'med_0305',
    qty: 90,
    unit: 'tablets',
    expiry: '2027-01-31',
    threshold: 20,
    price: 13.5,
  },
  {
    drug: 'med_0303',
    qty: 60,
    unit: 'tablets',
    expiry: '2026-12-31',
    threshold: 20,
    price: 16.0,
  },
  {
    drug: 'med_0602',
    qty: 12,
    unit: 'tablets',
    expiry: '2026-09-30',
    threshold: 10,
    price: 45.0,
  },
  {
    drug: 'med_0309',
    qty: 90,
    unit: 'tablets',
    expiry: '2027-03-31',
    threshold: 20,
    price: 28.0,
  },
];

// Second batches of drugs above with an earlier (still future) expiry, so
// dispensing takes from these first (FEFO).
const SECOND_BATCHES: SeedBatch[] = [
  {
    drug: 'med_0501',
    qty: 400,
    unit: 'tablets',
    expiry: '2027-01-31',
    threshold: 100,
    price: 3.0,
  },
  {
    drug: 'med_0601',
    qty: 50,
    unit: 'capsules',
    expiry: '2027-02-28',
    threshold: 30,
    price: 22.0,
  },
  {
    drug: 'med_0401',
    qty: 150,
    unit: 'capsules',
    expiry: '2027-03-31',
    threshold: 20,
    price: 8.0,
  },
];

async function insertBatch(
  db: DataSource,
  b: SeedBatch,
  batchNumber: string,
  organizationId: string,
) {
  const d = drug(b.drug);
  await db.query(
    `INSERT INTO stock (id, "medicationCode", "medicationName", "genericName", form, strength, quantity, unit, "expiryDate", "reorderThreshold", "unitPrice", "batchNumber", "organizationId", active)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)`,
    [
      d.id,
      d.name,
      d.genericName,
      d.form,
      d.strength,
      b.qty,
      b.unit,
      b.expiry,
      b.threshold,
      b.price,
      batchNumber,
      organizationId,
    ],
  );
}

/** Stock for the first pharmacy, and half as much of the first eight drugs for the second. */
export async function seedStock(db: DataSource, [colombo, kandy]: string[]) {
  const number = (b: SeedBatch) => b.drug.replace('med_', '');
  for (const b of STOCK) await insertBatch(db, b, `B-${number(b)}-A`, colombo);
  for (const b of SECOND_BATCHES)
    await insertBatch(db, b, `B-${number(b)}-B`, colombo);
  const kandyStock = STOCK.slice(0, 8);
  for (const b of kandyStock)
    await insertBatch(
      db,
      { ...b, qty: Math.floor(b.qty / 2) },
      `B2-${number(b)}-A`,
      kandy,
    );
  console.log(
    `✅ ${STOCK.length + SECOND_BATCHES.length + kandyStock.length} pharmacy stock batches created (incl. multi-batch, 2 pharmacies)`,
  );
}
