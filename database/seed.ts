import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { connectionOptions } from './data-source';
// Imported from source: this image is built without the workspaces.
import {
  generatePatientCode,
  generatePhn,
} from '../packages/shared/src/identifiers';
import { seedLabCatalog, seedLabOrders, type SeededLabs } from './seed-labs';

// The seed writes raw SQL against the schema created by `npm run db:migrate`.
// These enums are just the column values it inserts.

enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PHARMACIST = 'PHARMACIST',
  LAB_STAFF = 'LAB_STAFF',
  NURSE = 'NURSE',
  SUPER_ADMIN = 'SUPER_ADMIN',
}
enum QCStatus {
  PASS = 'pass',
  FAIL = 'fail',
  WARNING = 'warning',
}

const AppDataSource = new DataSource(connectionOptions);

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const HASH = (p: string) => bcrypt.hashSync(p, 12);

// ===== Idempotent top-ups =====
// Runs on every seed invocation — both after a fresh seed and against an
// already-seeded volume — so data added after the initial seed (new roles,
// DB-backed catalogs) reaches existing databases without a volume wipe.
// Every statement must be safe to re-run.

type IdRow = { id: string };

interface StaffSeed {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  password: string;
  organizationId: string | null;
  specialization?: string;
  qualification?: string;
  licenseNumber?: string;
}

/** Inserts a practitioner and its login account, linked both ways. */
async function insertStaff(
  db: DataSource,
  s: StaffSeed,
): Promise<{ practitionerId: string; userId: string }> {
  const [prac] = await db.query<IdRow[]>(
    `
    INSERT INTO practitioners (id, "firstName", "lastName", email, gender, role, specialization, qualification, "licenseNumber", "organizationId", active)
    VALUES (gen_random_uuid(), $1, $2, $3, 'unknown', $4, $5, $6, $7, $8, true)
    RETURNING id
  `,
    [
      s.firstName,
      s.lastName,
      s.email,
      s.role,
      s.specialization ?? null,
      s.qualification ?? null,
      s.licenseNumber ?? null,
      s.organizationId,
    ],
  );
  const [user] = await db.query<IdRow[]>(
    `
    INSERT INTO users (id, email, "passwordHash", role, "practitionerId", "isActive")
    VALUES (gen_random_uuid(), $1, $2, $3, $4, true)
    RETURNING id
  `,
    [s.email, HASH(s.password), s.role, prac.id],
  );
  await db.query(`UPDATE practitioners SET "userId" = $1 WHERE id = $2`, [
    user.id,
    prac.id,
  ]);
  return { practitionerId: prac.id, userId: user.id };
}

/** Adds a staff member to the first clinic unless their email is taken. */
async function ensureStaffUser(
  db: DataSource,
  s: Omit<StaffSeed, 'organizationId'>,
): Promise<boolean> {
  const existing = await db.query<IdRow[]>(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [s.email],
  );
  if (existing.length > 0) return false;
  const [clinic] = await db.query<IdRow[]>(
    `SELECT id FROM organizations WHERE type = 'clinic' ORDER BY "createdAt" LIMIT 1`,
  );
  await insertStaff(db, { ...s, organizationId: clinic?.id ?? null });
  return true;
}

async function topUps(db: DataSource) {
  // ---- NURSES (Nursing Officers — pre-visit triage) ----
  const nurses = [
    { firstName: 'Nimasha', lastName: 'Herath', email: 'nimasha@curo.health' },
    { firstName: 'Ruwan', lastName: 'Ekanayake', email: 'ruwan@curo.health' },
  ];
  let nursesCreated = 0;
  for (const n of nurses) {
    const created = await ensureStaffUser(db, {
      ...n,
      role: UserRole.NURSE,
      password: 'Nurse@123',
      qualification: 'Nursing',
    });
    if (created) nursesCreated++;
  }
  console.log(`✅ nurses ensured (${nursesCreated} new)`);

  // ---- PHARMACISTS' PHARMACIES AND LAB STAFF'S LABS ----
  // Each works only with their own pharmacy's stock or their own lab's tests.
  // Databases seeded before then have them at the clinic. Moves them, unless
  // an admin has already put them at the right kind of place.
  const workplaces = [
    ['kasun.pharma@curo.health', 'Curo Pharmacy — Colombo', 'pharmacy'],
    ['niluka.pharma@curo.health', 'Curo Pharmacy — Kandy', 'pharmacy'],
    ['tharindi.lab@curo.health', 'Curo Diagnostics — Colombo', 'laboratory'],
    ['rukshan.lab@curo.health', 'Curo Diagnostics — Galle', 'laboratory'],
  ];
  for (const [email, workplace, type] of workplaces) {
    await db.query(
      `UPDATE practitioners p SET "organizationId" = o.id::text
       FROM organizations o
       WHERE p.email = $1 AND o.name = $2 AND o.type = $3
         AND NOT EXISTS (
           SELECT 1 FROM organizations cur
           WHERE cur.id::text = p."organizationId" AND cur.type = $3)`,
      [email, workplace, type],
    );
  }
  console.log(
    '✅ seeded pharmacists and lab staff assigned to their workplaces',
  );

  // ---- LAB ORDERS' LABS (only the lab a test was sent to works on it) ----
  // Orders placed before tests were sent to a lab go to the Colombo lab, which
  // offers every test.
  await db.query(
    `UPDATE service_requests SET "performerOrganizationId" = o.id::text
     FROM organizations o
     WHERE "performerOrganizationId" IS NULL
       AND o.name = 'Curo Diagnostics — Colombo' AND o.type = 'laboratory'`,
  );
  console.log('✅ lab orders without a lab sent to the Colombo lab');

  // ---- MEDICATION CATALOG (prescribing reference, DB-backed) ----
  const medicationCatalog = [
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
  ];
  for (const m of medicationCatalog) {
    await db.query(
      `
      INSERT INTO medication_catalog (id, name, "genericName", form, strength, atc, "commonSubstitutes", active)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        m.id,
        m.name,
        m.genericName,
        m.form,
        m.strength,
        m.atc,
        JSON.stringify(m.commonSubstitutes),
      ],
    );
  }
  console.log(
    `✅ ${medicationCatalog.length} medication catalog entries ensured`,
  );

  // ---- ICD-10 DIAGNOSIS CATALOG (DB-backed) ----
  const icd10Codes = [
    {
      code: 'E11.9',
      name: 'Type 2 diabetes mellitus without complications',
      keywords: ['diabetes', 't2dm'],
    },
    {
      code: 'I10',
      name: 'Essential (primary) hypertension',
      keywords: ['hypertension', 'high blood pressure'],
    },
    {
      code: 'J45.909',
      name: 'Unspecified asthma, uncomplicated',
      keywords: ['asthma'],
    },
    {
      code: 'J45.901',
      name: 'Unspecified asthma with (acute) exacerbation',
      keywords: ['asthma', 'exacerbation', 'wheezing'],
    },
    { code: 'R05', name: 'Cough', keywords: ['cough'] },
  ];
  for (const c of icd10Codes) {
    await db.query(
      `
      INSERT INTO icd10_codes (code, name, keywords)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (code) DO NOTHING
    `,
      [c.code, c.name, JSON.stringify(c.keywords)],
    );
  }
  console.log(`✅ ${icd10Codes.length} ICD-10 codes ensured`);
}

async function seed() {
  await AppDataSource.initialize();
  const db = AppDataSource;

  console.log('🌱 Starting seed...');

  // ---- SUPER ADMIN ----
  const existingAdmin = await db.query<IdRow[]>(
    `SELECT id FROM users WHERE email = 'admin@curo.health' LIMIT 1`,
  );
  if (existingAdmin.length > 0) {
    console.log('⚠️  Data already seeded — applying idempotent top-ups only.');
    await topUps(db);
    await AppDataSource.destroy();
    process.exit(0);
  }

  // ---- ORGANIZATIONS (clinic + pharmacies + labs) ----
  async function insertOrg(
    name: string,
    type: string,
    city: string,
    phone: string,
  ): Promise<string> {
    const [o] = await db.query<IdRow[]>(
      `
      INSERT INTO organizations (id, name, type, city, phone, active)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, true) RETURNING id
    `,
      [name, type, city, phone],
    );
    return o.id;
  }
  const orgId = await insertOrg(
    'Curo Central Clinic',
    'clinic',
    'Colombo',
    '+94112000000',
  );
  const pharmacyOrgIds = [
    await insertOrg(
      'Curo Pharmacy — Colombo',
      'pharmacy',
      'Colombo',
      '+94112000111',
    ),
    await insertOrg(
      'Curo Pharmacy — Kandy',
      'pharmacy',
      'Kandy',
      '+94812000222',
    ),
  ];
  const labOrgIds = [
    await insertOrg(
      'Curo Diagnostics — Colombo',
      'laboratory',
      'Colombo',
      '+94112000333',
    ),
    await insertOrg(
      'Curo Diagnostics — Galle',
      'laboratory',
      'Galle',
      '+94912000444',
    ),
  ];
  console.log('✅ organizations created (1 clinic, 2 pharmacies, 2 labs)');

  // ---- SUPER ADMIN USER ----
  await db.query(
    `
    INSERT INTO users (id, email, "passwordHash", role, "isActive")
    VALUES (gen_random_uuid(), 'admin@curo.health', $1, 'SUPER_ADMIN', true)
  `,
    [HASH('Admin@12345')],
  );
  console.log('✅ Super admin created — admin@curo.health / Admin@12345');

  // ---- DOCTORS ----
  const doctors = [
    {
      firstName: 'Priya',
      lastName: 'Rajapaksa',
      email: 'dr.priya@curo.health',
      specialization: 'General Medicine',
      qualification: 'MBBS, MD',
      licenseNumber: 'SLMC-001',
    },
    {
      firstName: 'Ashan',
      lastName: 'Fernando',
      email: 'dr.ashan@curo.health',
      specialization: 'Cardiology',
      qualification: 'MBBS, MD (Cardiology)',
      licenseNumber: 'SLMC-002',
    },
    {
      firstName: 'Nimal',
      lastName: 'Perera',
      email: 'dr.nimal@curo.health',
      specialization: 'Pediatrics',
      qualification: 'MBBS, DCH',
      licenseNumber: 'SLMC-003',
    },
  ];

  const doctorIds: string[] = [];
  const doctorUserIds: string[] = [];
  for (const d of doctors) {
    const { practitionerId, userId } = await insertStaff(db, {
      ...d,
      role: UserRole.DOCTOR,
      password: 'Doctor@123',
      organizationId: orgId,
    });
    doctorIds.push(practitionerId);
    doctorUserIds.push(userId);
  }
  console.log('✅ 3 doctors created');

  // ---- RECEPTIONISTS ----
  const receptionists = [
    { firstName: 'Chamali', lastName: 'Silva', email: 'chamali@curo.health' },
    { firstName: 'Dinesh', lastName: 'Wijeratne', email: 'dinesh@curo.health' },
  ];
  const receptionistIds: string[] = [];
  for (const r of receptionists) {
    const { practitionerId } = await insertStaff(db, {
      ...r,
      role: UserRole.RECEPTIONIST,
      password: 'Recept@123',
      organizationId: orgId,
    });
    receptionistIds.push(practitionerId);
  }
  console.log('✅ 2 receptionists created');

  // ---- PHARMACISTS ----
  const pharmacists = [
    {
      firstName: 'Kasun',
      lastName: 'Bandara',
      email: 'kasun.pharma@curo.health',
    },
    {
      firstName: 'Niluka',
      lastName: 'Mendis',
      email: 'niluka.pharma@curo.health',
    },
  ];
  // Kasun works at the Colombo pharmacy, Niluka at Kandy.
  const pharmacistIds: string[] = [];
  for (const [i, p] of pharmacists.entries()) {
    const { practitionerId } = await insertStaff(db, {
      ...p,
      role: UserRole.PHARMACIST,
      password: 'Pharma@123',
      organizationId: pharmacyOrgIds[i],
    });
    pharmacistIds.push(practitionerId);
  }
  console.log('✅ 2 pharmacists created (one per pharmacy)');

  // ---- LAB STAFF ----
  const labStaff = [
    {
      firstName: 'Tharindi',
      lastName: 'Jayawardena',
      email: 'tharindi.lab@curo.health',
    },
    {
      firstName: 'Rukshan',
      lastName: 'Gunasekara',
      email: 'rukshan.lab@curo.health',
    },
  ];
  // Tharindi works at the Colombo lab, Rukshan at Galle.
  const labStaffIds: string[] = [];
  for (const [i, l] of labStaff.entries()) {
    const { practitionerId } = await insertStaff(db, {
      ...l,
      role: UserRole.LAB_STAFF,
      password: 'LabStaff@123',
      organizationId: labOrgIds[i],
    });
    labStaffIds.push(practitionerId);
  }
  console.log('✅ 2 lab staff created (one per lab)');

  // Nurses + DB-backed catalogs (same idempotent step that runs on existing volumes)
  await topUps(db);

  // ---- PATIENTS ----
  const patientData = [
    {
      fn: 'Samantha',
      ln: 'Wijesekara',
      dob: '1985-03-12',
      gender: 'female',
      nic: '852728456V',
      phone: '+94771234567',
      email: 'samantha@email.com',
      blood: 'A+',
      city: 'Colombo',
    },
    {
      fn: 'Roshan',
      ln: 'Kumara',
      dob: '1972-07-25',
      gender: 'male',
      nic: '727066789V',
      phone: '+94772345678',
      email: 'roshan@email.com',
      blood: 'B+',
      city: 'Kandy',
    },
    {
      fn: 'Amali',
      ln: 'Dissanayake',
      dob: '1990-11-03',
      gender: 'female',
      nic: '902789123V',
      phone: '+94773456789',
      email: 'amali@email.com',
      blood: 'O+',
      city: 'Galle',
    },
    {
      fn: 'Tharaka',
      ln: 'Pathirana',
      dob: '1968-05-18',
      gender: 'male',
      nic: '683399456V',
      phone: '+94774567890',
      email: 'tharaka@email.com',
      blood: 'AB+',
      city: 'Colombo',
    },
    {
      fn: 'Ishani',
      ln: 'Rajapaksa',
      dob: '1995-09-22',
      gender: 'female',
      nic: '952657890V',
      phone: '+94775678901',
      email: 'ishani@email.com',
      blood: 'A-',
      city: 'Negombo',
    },
    {
      fn: 'Buddhika',
      ln: 'Senanayake',
      dob: '1980-01-30',
      gender: 'male',
      nic: '800301234V',
      phone: '+94776789012',
      email: 'buddhika@email.com',
      blood: 'O-',
      city: 'Colombo',
    },
    {
      fn: 'Malsha',
      ln: 'Jayasinghe',
      dob: '2000-06-14',
      gender: 'female',
      nic: '002657123V',
      phone: '+94777890123',
      email: 'malsha@email.com',
      blood: 'B-',
      city: 'Matara',
    },
    {
      fn: 'Lasantha',
      ln: 'Gunatilake',
      dob: '1955-12-08',
      gender: 'male',
      nic: '554998789V',
      phone: '+94778901234',
      email: 'lasantha@email.com',
      blood: 'A+',
      city: 'Colombo',
    },
    {
      fn: 'Nadeeka',
      ln: 'Wickramasinghe',
      dob: '1978-04-20',
      gender: 'female',
      nic: '783114567V',
      phone: '+94779012345',
      email: 'nadeeka@email.com',
      blood: 'AB-',
      city: 'Kurunegala',
    },
    {
      fn: 'Chanuka',
      ln: 'Madusanka',
      dob: '1988-08-15',
      gender: 'male',
      nic: '883276789V',
      phone: '+94770123456',
      email: 'chanuka@email.com',
      blood: 'O+',
      city: 'Colombo',
    },
    // Minor patient — no NIC (identified solely by the Personal Health Number)
    {
      fn: 'Sehan',
      ln: 'Perera',
      dob: '2018-05-04',
      gender: 'male',
      nic: null,
      phone: '+94771112233',
      email: 'sehan.guardian@email.com',
      blood: 'A+',
      city: 'Colombo',
    },
  ];

  const patientIds: string[] = [];
  const patientUserIds: string[] = [];
  for (const p of patientData) {
    const code = generatePatientCode();
    const phn = generatePhn();
    const [patient] = await db.query<IdRow[]>(
      `
      INSERT INTO patients (id, "patientCode", "personalHealthNumber", "firstName", "lastName", "birthDate", gender, nic, phone, email, "bloodType", city, country, active)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Sri Lanka', true)
      RETURNING id
    `,
      [
        code,
        phn,
        p.fn,
        p.ln,
        p.dob,
        p.gender,
        p.nic,
        p.phone,
        p.email,
        p.blood,
        p.city,
      ],
    );
    const [user] = await db.query<IdRow[]>(
      `
      INSERT INTO users (id, email, "passwordHash", role, "patientId", "isActive")
      VALUES (gen_random_uuid(), $1, $2, 'PATIENT', $3, true)
      RETURNING id
    `,
      [p.email, HASH('Patient@123'), patient.id],
    );
    await db.query(`UPDATE patients SET "userId" = $1 WHERE id = $2`, [
      user.id,
      patient.id,
    ]);
    patientIds.push(patient.id);
    patientUserIds.push(user.id);
  }
  console.log(`✅ ${patientData.length} patients created`);

  // ---- ALLERGIES ----
  const allergyData = [
    {
      patientIdx: 0,
      code: 'amoxicillin',
      display: 'Amoxicillin',
      type: 'allergy',
      crit: 'high',
      cat: 'medication',
      status: 'active',
    },
    {
      patientIdx: 1,
      code: 'penicillin',
      display: 'Penicillin',
      type: 'allergy',
      crit: 'high',
      cat: 'medication',
      status: 'active',
    },
    {
      patientIdx: 2,
      code: 'peanut',
      display: 'Peanuts',
      type: 'allergy',
      crit: 'high',
      cat: 'food',
      status: 'active',
    },
    {
      patientIdx: 3,
      code: 'aspirin',
      display: 'Aspirin',
      type: 'intolerance',
      crit: 'low',
      cat: 'medication',
      status: 'active',
    },
    {
      patientIdx: 4,
      code: 'lactose',
      display: 'Lactose',
      type: 'intolerance',
      crit: 'low',
      cat: 'food',
      status: 'active',
    },
    {
      patientIdx: 5,
      code: 'sulfa',
      display: 'Sulfonamides',
      type: 'allergy',
      crit: 'high',
      cat: 'medication',
      status: 'active',
    },
  ];
  for (const a of allergyData) {
    await db.query(
      `
      INSERT INTO allergy_intolerances (id, "patientId", "practitionerId", type, criticality, code, display, category, "clinicalStatus", "verificationStatus")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
    `,
      [
        patientIds[a.patientIdx],
        rnd(doctorIds),
        a.type,
        a.crit,
        a.code,
        a.display,
        a.cat,
        a.status,
      ],
    );
  }
  console.log('✅ Allergies created');

  // ---- CONDITIONS ----
  const conditionData = [
    {
      pIdx: 0,
      code: 'E11',
      display: 'Type 2 Diabetes Mellitus',
      status: 'active',
      cat: 'problem-list-item',
    },
    {
      pIdx: 0,
      code: 'I10',
      display: 'Essential Hypertension',
      status: 'active',
      cat: 'problem-list-item',
    },
    {
      pIdx: 1,
      code: 'I25.1',
      display: 'Atherosclerotic Heart Disease',
      status: 'active',
      cat: 'problem-list-item',
    },
    {
      pIdx: 2,
      code: 'J45.9',
      display: 'Asthma, Unspecified',
      status: 'active',
      cat: 'problem-list-item',
    },
    {
      pIdx: 3,
      code: 'M54.5',
      display: 'Low Back Pain',
      status: 'active',
      cat: 'problem-list-item',
    },
    {
      pIdx: 4,
      code: 'F41.1',
      display: 'Generalized Anxiety Disorder',
      status: 'active',
      cat: 'problem-list-item',
    },
    {
      pIdx: 5,
      code: 'K21.0',
      display: 'GERD with Esophagitis',
      status: 'active',
      cat: 'problem-list-item',
    },
    {
      pIdx: 6,
      code: 'J06.9',
      display: 'Acute Upper Respiratory Infection',
      status: 'resolved',
      cat: 'encounter-diagnosis',
    },
    {
      pIdx: 7,
      code: 'I50.9',
      display: 'Heart Failure, Unspecified',
      status: 'active',
      cat: 'problem-list-item',
    },
    {
      pIdx: 8,
      code: 'N18.3',
      display: 'Chronic Kidney Disease, Stage 3',
      status: 'active',
      cat: 'problem-list-item',
    },
  ];
  for (const c of conditionData) {
    await db.query(
      `
      INSERT INTO conditions (id, "patientId", "practitionerId", "clinicalStatus", "verificationStatus", category, code, display)
      VALUES (gen_random_uuid(), $1, $2, $3, 'confirmed', $4, $5, $6)
    `,
      [patientIds[c.pIdx], rnd(doctorIds), c.status, c.cat, c.code, c.display],
    );
  }
  console.log('✅ Conditions created');

  // ---- APPOINTMENTS ----
  const appointmentRows: {
    id: string;
    patientId: string;
    practitionerId: string;
    isPast: boolean;
  }[] = [];
  for (let i = 0; i < 20; i++) {
    const patIdx = i % 10;
    const docIdx = i % 3;
    const daysOffset = i < 10 ? -(i + 1) : i - 10 + 1;
    const startHour = 9 + (i % 6);
    const start = daysAgo(-daysOffset);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(30);
    const isPast = daysOffset < 0;
    const status = isPast
      ? Math.random() > 0.2
        ? 'fulfilled'
        : 'noshow'
      : 'booked';
    const [appt] = await db.query<IdRow[]>(
      `
      INSERT INTO appointments (id, "patientId", "practitionerId", status, start, "end", description, "serviceType", "slotNumber")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'General Consultation', $7)
      RETURNING id
    `,
      [
        patientIds[patIdx],
        doctorIds[docIdx],
        status,
        start,
        end,
        `Appointment for ${patientData[patIdx].fn} ${patientData[patIdx].ln}`,
        i + 1,
      ],
    );
    appointmentRows.push({
      id: appt.id,
      patientId: patientIds[patIdx],
      practitionerId: doctorIds[docIdx],
      isPast,
    });
  }
  console.log('✅ 20 appointments created');

  // ---- TODAY'S PATIENT FLOW (nurse triage demo) ----
  // A spread of queue stages so the nurse station, reception queue board and the
  // doctor's schedule all have something to show on a fresh stack.
  const [nurse] = await db.query<IdRow[]>(
    `SELECT id FROM practitioners WHERE role = 'NURSE' ORDER BY "createdAt" LIMIT 1`,
  );
  const todayFlow = [
    {
      patIdx: 5,
      docIdx: 0,
      hour: 8,
      minute: 0,
      status: 'fulfilled',
      stage: 'done',
    },
    {
      patIdx: 6,
      docIdx: 0,
      hour: 8,
      minute: 30,
      status: 'arrived',
      stage: 'with_doctor',
    },
    {
      patIdx: 7,
      docIdx: 1,
      hour: 9,
      minute: 0,
      status: 'arrived',
      stage: 'ready_for_doctor',
      vitals: true,
    },
    {
      patIdx: 8,
      docIdx: 1,
      hour: 9,
      minute: 30,
      status: 'arrived',
      stage: 'waiting_nurse',
    },
    {
      patIdx: 9,
      docIdx: 2,
      hour: 10,
      minute: 0,
      status: 'arrived',
      stage: 'waiting_nurse',
    },
  ];
  // Triage readings for the ready_for_doctor patient — one hypertensive BP to show the flags.
  const triageVitals = [
    {
      code: '8480-6',
      display: 'Blood Pressure Systolic',
      value: 152,
      unit: 'mmHg',
    },
    {
      code: '8462-4',
      display: 'Blood Pressure Diastolic',
      value: 96,
      unit: 'mmHg',
    },
    { code: '8867-4', display: 'Heart rate', value: 88, unit: 'bpm' },
    { code: '2708-6', display: 'Oxygen saturation', value: 97, unit: '%' },
    { code: '8310-5', display: 'Body temperature', value: 36.9, unit: 'Cel' },
  ];
  for (const f of todayFlow) {
    const start = new Date();
    start.setHours(f.hour, f.minute, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const [appt] = await db.query<IdRow[]>(
      `
      INSERT INTO appointments (id, "patientId", "practitionerId", status, "queueStage", start, "end", description, "serviceType", "reasonCode")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'General Consultation', 'Review visit')
      RETURNING id
    `,
      [
        patientIds[f.patIdx],
        doctorIds[f.docIdx],
        f.status,
        f.stage,
        start,
        end,
        `Appointment for ${patientData[f.patIdx].fn} ${patientData[f.patIdx].ln}`,
      ],
    );
    if (f.vitals && nurse) {
      for (const v of triageVitals) {
        await db.query(
          `
          INSERT INTO observations (id, "patientId", "practitionerId", "appointmentId", "performerRole", status, category, code, display, "valueQuantity", "valueUnit", "effectiveDateTime")
          VALUES (gen_random_uuid(), $1, $2, $3, 'NURSE', 'final', 'vital-signs', $4, $5, $6, $7, NOW())
        `,
          [
            patientIds[f.patIdx],
            nurse.id,
            appt.id,
            v.code,
            v.display,
            v.value,
            v.unit,
          ],
        );
      }
    }
  }
  console.log(`✅ ${todayFlow.length} appointments in today's patient flow`);

  // ---- PAYMENTS (receptionist-collected visit income) ----
  const consultationFees = [1500, 2000, 2500, 3000, 3500];
  let paymentCount = 0;
  for (let i = 0; i < appointmentRows.length; i++) {
    const appt = appointmentRows[i];
    if (!appt.isPast) continue; // only collect for completed/past visits
    const collectedBy = receptionistIds[i % receptionistIds.length];
    const amount = consultationFees[i % consultationFees.length];
    const paidAt = daysAgo(i + 1);
    await db.query(
      `
      INSERT INTO payments (id, "patientId", "appointmentId", "collectedBy", type, amount, currency, "paymentMethod", status, "receiptNumber", "paidAt")
      VALUES (gen_random_uuid(), $1, $2, $3, 'consultation', $4, 'LKR', 'cash', 'paid', $5, $6)
    `,
      [
        appt.patientId,
        appt.id,
        collectedBy,
        amount,
        `RCP-${Date.now()}-${1000 + i}`,
        paidAt,
      ],
    );
    paymentCount++;
  }
  console.log(`✅ ${paymentCount} payments created`);

  // ---- ENCOUNTERS ----
  const encounterIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const appt = appointmentRows.filter((a) => a.isPast)[i];
    if (!appt) continue;
    const start = daysAgo(i + 1);
    const [enc] = await db.query<IdRow[]>(
      `
      INSERT INTO encounters (id, "patientId", "practitionerId", "appointmentId", status, "classCode", "serviceType", "periodStart", "periodEnd")
      VALUES (gen_random_uuid(), $1, $2, $3, 'completed', 'AMB', 'General Consultation', $4, $5)
      RETURNING id
    `,
      [
        appt.patientId,
        appt.practitionerId,
        appt.id,
        start,
        new Date(start.getTime() + 1800000),
      ],
    );
    encounterIds.push(enc.id);

    await db.query(`UPDATE appointments SET "encounterId" = $1 WHERE id = $2`, [
      enc.id,
      appt.id,
    ]);

    // Clinical note
    await db.query(
      `
      INSERT INTO clinical_notes (id, "encounterId", "patientId", "practitionerId", subjective, objective, assessment, plan)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
    `,
      [
        enc.id,
        appt.patientId,
        appt.practitionerId,
        'Patient reports mild discomfort and fatigue for the past 3 days.',
        `BP: 120/80 mmHg, HR: 78 bpm, Temp: 37.1°C, SpO2: 98%. Patient appears well.`,
        `Stable condition. Vitals within normal range.`,
        `Continue current medications. Follow up in 2 weeks. Monitor symptoms.`,
      ],
    );

    // Vitals
    const vitalSets = [
      {
        code: '8480-6',
        display: 'Systolic Blood Pressure',
        value: 115 + Math.floor(Math.random() * 20),
        unit: 'mmHg',
      },
      {
        code: '8462-4',
        display: 'Diastolic Blood Pressure',
        value: 70 + Math.floor(Math.random() * 15),
        unit: 'mmHg',
      },
      {
        code: '8867-4',
        display: 'Heart Rate',
        value: 68 + Math.floor(Math.random() * 20),
        unit: '/min',
      },
      {
        code: '8310-5',
        display: 'Body Temperature',
        value: 36.5 + Math.random() * 1,
        unit: '°C',
      },
      {
        code: '2708-6',
        display: 'Oxygen Saturation',
        value: 96 + Math.floor(Math.random() * 4),
        unit: '%',
      },
    ];
    for (const v of vitalSets) {
      await db.query(
        `
        INSERT INTO observations (id, "patientId", "practitionerId", "encounterId", status, category, code, display, "valueQuantity", "valueUnit", "effectiveDateTime")
        VALUES (gen_random_uuid(), $1, $2, $3, 'final', 'vital-signs', $4, $5, $6, $7, $8)
      `,
        [
          appt.patientId,
          appt.practitionerId,
          enc.id,
          v.code,
          v.display,
          v.value,
          v.unit,
          start,
        ],
      );
    }
  }
  console.log('✅ 10 encounters + notes + vitals created');

  // ---- TREND OBSERVATIONS (for doctor charts: glucose + cholesterol over time) ----
  // category-agnostic so the multi-code trend endpoint returns them alongside BP.
  let trendCount = 0;
  for (const patIdx of [0, 1]) {
    let week = 12;
    for (let i = 0; i < 6; i++, week -= 2) {
      const when = daysAgo(week * 7);
      // Fasting glucose (mg/dL) — ref 70–110, a couple of highs to trigger flags
      const glucose = [98, 105, 132, 118, 145, 110][i];
      await db.query(
        `
        INSERT INTO observations (id, "patientId", "practitionerId", status, category, code, display, "valueQuantity", "valueUnit", "referenceRangeLow", "referenceRangeHigh", "effectiveDateTime")
        VALUES (gen_random_uuid(), $1, $2, 'final', 'laboratory', '2345-7', 'Glucose', $3, 'mg/dL', '70', '110', $4)
      `,
        [patientIds[patIdx], doctorIds[0], glucose, when],
      );
      // Total cholesterol (mg/dL) — ref <200
      const chol = [185, 195, 215, 205, 240, 210][i];
      await db.query(
        `
        INSERT INTO observations (id, "patientId", "practitionerId", status, category, code, display, "valueQuantity", "valueUnit", "referenceRangeLow", "referenceRangeHigh", "effectiveDateTime")
        VALUES (gen_random_uuid(), $1, $2, 'final', 'laboratory', '2093-3', 'Total Cholesterol', $3, 'mg/dL', '0', '200', $4)
      `,
        [patientIds[patIdx], doctorIds[0], chol, when],
      );
      trendCount += 2;
    }
  }
  console.log(`✅ ${trendCount} trend observations created`);

  // ---- PRESCRIPTIONS ----
  const medications = [
    {
      code: 'metformin-500mg',
      display: 'Metformin 500mg',
      dosage: '1 tablet twice daily',
      route: 'oral',
      freq: 'BID',
      qty: 60,
      unit: 'tablets',
    },
    {
      code: 'amlodipine-5mg',
      display: 'Amlodipine 5mg',
      dosage: '1 tablet once daily',
      route: 'oral',
      freq: 'QD',
      qty: 30,
      unit: 'tablets',
    },
    {
      code: 'atorvastatin-20mg',
      display: 'Atorvastatin 20mg',
      dosage: '1 tablet at night',
      route: 'oral',
      freq: 'QN',
      qty: 30,
      unit: 'tablets',
    },
    {
      code: 'omeprazole-20mg',
      display: 'Omeprazole 20mg',
      dosage: '1 capsule before meals',
      route: 'oral',
      freq: 'BID',
      qty: 60,
      unit: 'capsules',
    },
    {
      code: 'salbutamol-inhaler',
      display: 'Salbutamol Inhaler 100mcg',
      dosage: '2 puffs when needed',
      route: 'inhalation',
      freq: 'PRN',
      qty: 1,
      unit: 'inhaler',
    },
    {
      code: 'losartan-50mg',
      display: 'Losartan 50mg',
      dosage: '1 tablet once daily',
      route: 'oral',
      freq: 'QD',
      qty: 30,
      unit: 'tablets',
    },
    {
      code: 'paracetamol-500mg',
      display: 'Paracetamol 500mg',
      dosage: '1-2 tablets every 6 hours',
      route: 'oral',
      freq: 'Q6H PRN',
      qty: 20,
      unit: 'tablets',
    },
    {
      code: 'amoxicillin-250mg',
      display: 'Amoxicillin 250mg',
      dosage: '1 capsule three times daily',
      route: 'oral',
      freq: 'TID',
      qty: 21,
      unit: 'capsules',
    },
  ];

  const prescriptionIds: string[] = [];
  for (let i = 0; i < 8; i++) {
    const med = medications[i];
    const encId = encounterIds[i % encounterIds.length];
    const pIdx = i % 10;
    const isCompleted = i < 5;
    const authoredOn = daysAgo(i + 1);
    const [rx] = await db.query<IdRow[]>(
      `
      INSERT INTO medication_requests (id, "patientId", "practitionerId", "encounterId", status, intent, "medicationCode", "medicationDisplay", "dosageText", route, frequency, "quantityValue", "quantityUnit", "durationDays", "authoredOn")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'order', $5, $6, $7, $8, $9, $10, $11, 30, $12)
      RETURNING id
    `,
      [
        patientIds[pIdx],
        rnd(doctorIds),
        encId || null,
        isCompleted ? 'completed' : 'active',
        med.code,
        med.display,
        med.dosage,
        med.route,
        med.freq,
        med.qty,
        med.unit,
        authoredOn,
      ],
    );
    prescriptionIds.push(rx.id);
  }
  console.log('✅ 8 prescriptions created');

  // ---- LAB CATALOG, AND AN ORDER FOR EACH VISIT (see seed-labs.ts) ----
  const labs: SeededLabs = {
    colombo: labOrgIds[0],
    galle: labOrgIds[1],
    technicianAt: Object.fromEntries(
      labOrgIds.map((labId, i) => [labId, labStaffIds[i]]),
    ),
  };
  await seedLabCatalog(db, labs);
  await seedLabOrders(db, labs, encounterIds);

  // ---- DISPENSE RECORDS ----
  // Each at the pharmacy of the pharmacist who dispensed it, by turns.
  for (let i = 0; i < 5; i++) {
    const rxId = prescriptionIds[i];
    const by = i % pharmacists.length;
    const [rx] = await db.query<
      {
        patientId: string;
        medicationCode: string;
        medicationDisplay: string;
        quantityValue: number | null;
        quantityUnit: string | null;
      }[]
    >(
      `SELECT "patientId", "medicationCode", "medicationDisplay", "quantityValue", "quantityUnit"
       FROM medication_requests WHERE id = $1`,
      [rxId],
    );
    await db.query(
      `
      INSERT INTO medication_dispenses (id, "medicationRequestId", "patientId", "pharmacistId", "organizationId", status, "medicationCode", "medicationDisplay", "quantityValue", "quantityUnit", "dispenserName", "unitPrice", "totalPrice", "receiptNumber", "whenHandedOver")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'completed', $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `,
      [
        rxId,
        rx.patientId,
        pharmacistIds[by],
        pharmacyOrgIds[by],
        rx.medicationCode,
        rx.medicationDisplay,
        rx.quantityValue || 30,
        rx.quantityUnit || 'tablets',
        `${pharmacists[by].firstName} ${pharmacists[by].lastName}`,
        50,
        (rx.quantityValue || 30) * 50,
        `RX-${Date.now()}-${i}`,
        daysAgo(i),
      ],
    );
  }
  console.log('✅ 5 dispense records created');

  // ---- PHARMACY STOCK ----
  const stockData = [
    {
      code: 'metformin-500mg',
      name: 'Metformin 500mg',
      generic: 'Metformin',
      form: 'tablet',
      strength: '500mg',
      qty: 500,
      unit: 'tablets',
      expiry: '2026-12-31',
      threshold: 50,
      price: 5.5,
    },
    {
      code: 'amlodipine-5mg',
      name: 'Amlodipine 5mg',
      generic: 'Amlodipine',
      form: 'tablet',
      strength: '5mg',
      qty: 300,
      unit: 'tablets',
      expiry: '2026-12-31',
      threshold: 30,
      price: 12.0,
    },
    {
      code: 'atorvastatin-20mg',
      name: 'Atorvastatin 20mg',
      generic: 'Atorvastatin',
      form: 'tablet',
      strength: '20mg',
      qty: 200,
      unit: 'tablets',
      expiry: '2027-06-30',
      threshold: 30,
      price: 18.5,
    },
    {
      code: 'omeprazole-20mg',
      name: 'Omeprazole 20mg',
      generic: 'Omeprazole',
      form: 'capsule',
      strength: '20mg',
      qty: 250,
      unit: 'capsules',
      expiry: '2026-09-30',
      threshold: 25,
      price: 8.0,
    },
    {
      code: 'salbutamol-inhaler',
      name: 'Salbutamol Inhaler 100mcg',
      generic: 'Salbutamol',
      form: 'inhaler',
      strength: '100mcg/puff',
      qty: 40,
      unit: 'inhalers',
      expiry: '2026-08-31',
      threshold: 5,
      price: 320.0,
    },
    {
      code: 'losartan-50mg',
      name: 'Losartan 50mg',
      generic: 'Losartan',
      form: 'tablet',
      strength: '50mg',
      qty: 150,
      unit: 'tablets',
      expiry: '2027-01-31',
      threshold: 20,
      price: 15.0,
    },
    {
      code: 'paracetamol-500mg',
      name: 'Paracetamol 500mg',
      generic: 'Paracetamol',
      form: 'tablet',
      strength: '500mg',
      qty: 1000,
      unit: 'tablets',
      expiry: '2027-03-31',
      threshold: 100,
      price: 3.0,
    },
    {
      code: 'amoxicillin-250mg',
      name: 'Amoxicillin 250mg',
      generic: 'Amoxicillin',
      form: 'capsule',
      strength: '250mg',
      qty: 8,
      unit: 'capsules',
      expiry: '2026-05-31',
      threshold: 30,
      price: 22.0,
    },
    {
      code: 'cetirizine-10mg',
      name: 'Cetirizine 10mg',
      generic: 'Cetirizine',
      form: 'tablet',
      strength: '10mg',
      qty: 100,
      unit: 'tablets',
      expiry: '2027-02-28',
      threshold: 20,
      price: 6.5,
    },
    {
      code: 'pantoprazole-40mg',
      name: 'Pantoprazole 40mg',
      generic: 'Pantoprazole',
      form: 'tablet',
      strength: '40mg',
      qty: 5,
      unit: 'tablets',
      expiry: '2025-12-31',
      threshold: 20,
      price: 14.0,
    },
    {
      code: 'metoprolol-50mg',
      name: 'Metoprolol 50mg',
      generic: 'Metoprolol',
      form: 'tablet',
      strength: '50mg',
      qty: 120,
      unit: 'tablets',
      expiry: '2026-11-30',
      threshold: 20,
      price: 11.0,
    },
    {
      code: 'aspirin-75mg',
      name: 'Aspirin 75mg',
      generic: 'Aspirin',
      form: 'tablet',
      strength: '75mg',
      qty: 600,
      unit: 'tablets',
      expiry: '2027-06-30',
      threshold: 50,
      price: 4.0,
    },
    {
      code: 'diclofenac-50mg',
      name: 'Diclofenac 50mg',
      generic: 'Diclofenac',
      form: 'tablet',
      strength: '50mg',
      qty: 80,
      unit: 'tablets',
      expiry: '2026-10-31',
      threshold: 15,
      price: 9.0,
    },
    {
      code: 'furosemide-40mg',
      name: 'Furosemide 40mg',
      generic: 'Furosemide',
      form: 'tablet',
      strength: '40mg',
      qty: 3,
      unit: 'tablets',
      expiry: '2026-07-31',
      threshold: 30,
      price: 7.0,
    },
    {
      code: 'vitamin-d3',
      name: 'Vitamin D3 1000IU',
      generic: 'Cholecalciferol',
      form: 'capsule',
      strength: '1000IU',
      qty: 200,
      unit: 'capsules',
      expiry: '2027-12-31',
      threshold: 30,
      price: 25.0,
    },
    {
      code: 'insulin-glargine',
      name: 'Insulin Glargine 100U/ml',
      generic: 'Insulin Glargine',
      form: 'injection',
      strength: '100U/ml',
      qty: 25,
      unit: 'vials',
      expiry: '2026-06-30',
      threshold: 5,
      price: 1800.0,
    },
    {
      code: 'lisinopril-10mg',
      name: 'Lisinopril 10mg',
      generic: 'Lisinopril',
      form: 'tablet',
      strength: '10mg',
      qty: 90,
      unit: 'tablets',
      expiry: '2027-01-31',
      threshold: 20,
      price: 13.5,
    },
    {
      code: 'simvastatin-20mg',
      name: 'Simvastatin 20mg',
      generic: 'Simvastatin',
      form: 'tablet',
      strength: '20mg',
      qty: 60,
      unit: 'tablets',
      expiry: '2026-12-31',
      threshold: 20,
      price: 16.0,
    },
    {
      code: 'azithromycin-500mg',
      name: 'Azithromycin 500mg',
      generic: 'Azithromycin',
      form: 'tablet',
      strength: '500mg',
      qty: 12,
      unit: 'tablets',
      expiry: '2026-09-30',
      threshold: 10,
      price: 45.0,
    },
    {
      code: 'clopidogrel-75mg',
      name: 'Clopidogrel 75mg',
      generic: 'Clopidogrel',
      form: 'tablet',
      strength: '75mg',
      qty: 90,
      unit: 'tablets',
      expiry: '2027-03-31',
      threshold: 20,
      price: 28.0,
    },
  ];

  for (const s of stockData) {
    await db.query(
      `
      INSERT INTO stock (id, "medicationCode", "medicationName", "genericName", form, strength, quantity, unit, "expiryDate", "reorderThreshold", "unitPrice", "batchNumber", "organizationId", active)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
    `,
      [
        s.code,
        s.name,
        s.generic,
        s.form,
        s.strength,
        s.qty,
        s.unit,
        s.expiry,
        s.threshold,
        s.price,
        `B-${s.code}-A`,
        pharmacyOrgIds[0],
      ],
    );
  }

  // Second batches of the same drug with DIFFERENT expiry dates (multi-batch / FEFO demo)
  // Earlier expiry than the primary batch (above), but still in the future, so
  // FEFO consumes these "-B" batches first.
  const secondBatches = [
    {
      code: 'paracetamol-500mg',
      name: 'Paracetamol 500mg',
      generic: 'Paracetamol',
      form: 'tablet',
      strength: '500mg',
      qty: 400,
      unit: 'tablets',
      expiry: '2027-01-31',
      threshold: 100,
      price: 3.0,
    },
    {
      code: 'amoxicillin-250mg',
      name: 'Amoxicillin 250mg',
      generic: 'Amoxicillin',
      form: 'capsule',
      strength: '250mg',
      qty: 50,
      unit: 'capsules',
      expiry: '2027-02-28',
      threshold: 30,
      price: 22.0,
    },
    {
      code: 'omeprazole-20mg',
      name: 'Omeprazole 20mg',
      generic: 'Omeprazole',
      form: 'capsule',
      strength: '20mg',
      qty: 150,
      unit: 'capsules',
      expiry: '2027-03-31',
      threshold: 20,
      price: 8.0,
    },
  ];
  for (const s of secondBatches) {
    await db.query(
      `
      INSERT INTO stock (id, "medicationCode", "medicationName", "genericName", form, strength, quantity, unit, "expiryDate", "reorderThreshold", "unitPrice", "batchNumber", "organizationId", active)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
    `,
      [
        s.code,
        s.name,
        s.generic,
        s.form,
        s.strength,
        s.qty,
        s.unit,
        s.expiry,
        s.threshold,
        s.price,
        `B-${s.code}-B`,
        pharmacyOrgIds[0],
      ],
    );
  }
  // Give the second pharmacy a small inventory too (subset of drugs)
  for (const s of stockData.slice(0, 8)) {
    await db.query(
      `
      INSERT INTO stock (id, "medicationCode", "medicationName", "genericName", form, strength, quantity, unit, "expiryDate", "reorderThreshold", "unitPrice", "batchNumber", "organizationId", active)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
    `,
      [
        s.code,
        s.name,
        s.generic,
        s.form,
        s.strength,
        Math.floor(s.qty / 2),
        s.unit,
        s.expiry,
        s.threshold,
        s.price,
        `B2-${s.code}-A`,
        pharmacyOrgIds[1],
      ],
    );
  }
  console.log(
    `✅ ${stockData.length + secondBatches.length + 8} pharmacy stock items created (incl. multi-batch, 2 pharmacies)`,
  );

  // ---- LAB INSTRUMENTS ----
  const instruments = [
    {
      name: 'Sysmex XN-550',
      model: 'XN-550',
      manufacturer: 'Sysmex',
      serial: 'SYS-XN-2023-001',
      category: 'hematology',
      status: 'operational',
      location: 'Lab Room 1',
    },
    {
      name: 'Beckman AU480',
      model: 'AU480',
      manufacturer: 'Beckman Coulter',
      serial: 'BCK-AU-2022-002',
      category: 'chemistry',
      status: 'operational',
      location: 'Lab Room 2',
    },
  ];
  // One instrument at each lab, so each lab's staff see only their own.
  const instrumentIds: string[] = [];
  for (const [i, inst] of instruments.entries()) {
    const [createdInstrument] = await db.query<IdRow[]>(
      `
      INSERT INTO lab_instruments (id, "organizationId", name, model, manufacturer, "serialNumber", status, location, category, "lastMaintenanceDate")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `,
      [
        labOrgIds[i % labOrgIds.length],
        inst.name,
        inst.model,
        inst.manufacturer,
        inst.serial,
        inst.status,
        inst.location,
        inst.category,
        '2026-01-15',
      ],
    );
    instrumentIds.push(createdInstrument.id);
  }
  console.log('✅ 2 lab instruments created');

  // ---- LAB QUALITY CONTROL LOGS ----
  const qcLogs = [
    {
      instrumentIdx: 0,
      testCode: '718-7',
      controlLevel: 'Normal',
      expectedValue: 13.5,
      observedValue: 13.4,
      unit: 'g/dL',
      status: QCStatus.PASS,
      staffIdx: 0,
      minutesAgo: 90,
      notes: '',
    },
    {
      instrumentIdx: 0,
      testCode: '26515-7',
      controlLevel: 'High',
      expectedValue: 420,
      observedValue: 438,
      unit: '10^3/uL',
      status: QCStatus.WARNING,
      staffIdx: 1,
      minutesAgo: 80,
      notes: 'Outside preferred range; repeat control before patient samples.',
    },
    {
      instrumentIdx: 1,
      testCode: '2345-7',
      controlLevel: 'Normal',
      expectedValue: 95,
      observedValue: 94,
      unit: 'mg/dL',
      status: QCStatus.PASS,
      staffIdx: 0,
      minutesAgo: 70,
      notes: '',
    },
    {
      instrumentIdx: 1,
      testCode: '17856-6',
      controlLevel: 'Normal',
      expectedValue: 5.4,
      observedValue: 6.1,
      unit: '%',
      status: QCStatus.FAIL,
      staffIdx: 1,
      minutesAgo: 60,
      notes: 'Out of range. Hold HbA1c runs until calibration is verified.',
    },
    {
      instrumentIdx: 1,
      testCode: '2093-3',
      controlLevel: 'High',
      expectedValue: 240,
      observedValue: 238,
      unit: 'mg/dL',
      status: QCStatus.PASS,
      staffIdx: 0,
      minutesAgo: 50,
      notes: '',
    },
  ];
  for (const log of qcLogs) {
    const performedAt = new Date(Date.now() - log.minutesAgo * 60_000);
    await db.query(
      `
      INSERT INTO lab_qc_logs (id, "instrumentId", "testCode", "controlLevel", "expectedValue", "observedValue", unit, status, "performedBy", "performedAt", notes)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
      [
        instrumentIds[log.instrumentIdx],
        log.testCode,
        log.controlLevel,
        log.expectedValue,
        log.observedValue,
        log.unit,
        log.status,
        labStaffIds[log.staffIdx],
        performedAt,
        log.notes,
      ],
    );
  }
  console.log(`✅ ${qcLogs.length} lab QC logs created`);

  // ---- NOTIFICATIONS ----
  const notifications = [
    {
      recipientId: patientUserIds[0],
      eventType: 'lab_results_ready',
      title: 'Lab Results Ready',
      message: 'Your CBC lab results are ready. Please log in to view.',
    },
    {
      recipientId: patientUserIds[1],
      eventType: 'appointment_confirmed',
      title: 'Appointment Confirmed',
      message: 'Your appointment with Dr. Fernando has been confirmed.',
    },
    {
      recipientId: patientUserIds[2],
      eventType: 'prescription_ready',
      title: 'Prescription Ready',
      message: 'Your prescription is ready for collection at the pharmacy.',
    },
  ];
  for (const n of notifications) {
    await db.query(
      `
      INSERT INTO notifications (id, "recipientId", "eventType", title, message, "isRead")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, false)
    `,
      [n.recipientId, n.eventType, n.title, n.message],
    );
  }
  console.log('✅ Notifications created');

  await AppDataSource.destroy();

  console.log('\n🎉 Seed complete! Login credentials:');
  console.log('   Super Admin:  admin@curo.health        / Admin@12345');
  console.log('   Doctors:      dr.priya@curo.health     / Doctor@123');
  console.log('                 dr.ashan@curo.health     / Doctor@123');
  console.log('                 dr.nimal@curo.health     / Doctor@123');
  console.log('   Receptionists: chamali@curo.health     / Recept@123');
  console.log('                  dinesh@curo.health      / Recept@123');
  console.log('   Pharmacists:  kasun.pharma@curo.health / Pharma@123');
  console.log('                 niluka.pharma@curo.health / Pharma@123');
  console.log('   Lab Staff:    tharindi.lab@curo.health / LabStaff@123');
  console.log('                 rukshan.lab@curo.health  / LabStaff@123');
  console.log('   Nurses:       nimasha@curo.health      / Nurse@123');
  console.log('                 ruwan@curo.health        / Nurse@123');
  console.log(
    '   Patients:     samantha@email.com       / Patient@123 (and others)',
  );
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
