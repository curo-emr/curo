import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';

// ===== Inline entity definitions for seeder =====
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

// We re-declare minimal entity classes here to avoid cross-service deps
// The real entities are in each service — these must match the DB schema

enum UserRole { PATIENT='PATIENT', DOCTOR='DOCTOR', RECEPTIONIST='RECEPTIONIST', PHARMACIST='PHARMACIST', LAB_STAFF='LAB_STAFF', SUPER_ADMIN='SUPER_ADMIN' }
enum Gender { MALE='male', FEMALE='female', OTHER='other', UNKNOWN='unknown' }
enum MaritalStatus { SINGLE='S', MARRIED='M', DIVORCED='D', WIDOWED='W', SEPARATED='L', UNKNOWN='UNK' }
enum AppointmentStatus { BOOKED='booked', ARRIVED='arrived', FULFILLED='fulfilled', CANCELLED='cancelled' }
enum EncounterStatus { IN_PROGRESS='in-progress', COMPLETED='completed', PLANNED='planned' }
enum MedReqStatus { ACTIVE='active', COMPLETED='completed' }
enum SvcReqStatus { ACTIVE='active', COMPLETED='completed' }
enum DiagStatus { FINAL='final' }
enum ObsStatus { FINAL='final' }
enum DispStatus { COMPLETED='completed' }
enum InstrumentStatus { OPERATIONAL='operational', MAINTENANCE='maintenance', OFFLINE='offline' }
enum AllergyType { ALLERGY='allergy', INTOLERANCE='intolerance' }
enum AllergyCrit { LOW='low', HIGH='high', UNABLE_TO_ASSESS='unable-to-assess' }
enum CondStatus { ACTIVE='active', RESOLVED='resolved' }
enum NotifType { APPOINTMENT_CONFIRMED='appointment_confirmed', LAB_RESULTS_READY='lab_results_ready', PRESCRIPTION_READY='prescription_ready', GENERAL='general' }

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'curo',
  password: process.env.DB_PASS || 'curo_secret',
  database: process.env.DB_NAME || 'curo_db',
  synchronize: false,
  logging: false,
});

function genCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CUR-';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function hoursFromNow(h: number) { const d = new Date(); d.setHours(d.getHours() + h); return d; }

const HASH = (p: string) => bcrypt.hashSync(p, 12);

async function seed() {
  await AppDataSource.initialize();
  const db = AppDataSource;

  console.log('🌱 Starting seed...');

  // ---- SUPER ADMIN ----
  const existingAdmin = await db.query(`SELECT id FROM users WHERE email = 'admin@curo.health' LIMIT 1`);
  if (existingAdmin.length > 0) {
    console.log('⚠️  Data already seeded. Drop tables or use --force to re-seed.');
    process.exit(0);
  }

  // ---- ORGANIZATIONS ----
  const [org] = await db.query(`
    INSERT INTO organizations (id, name, type, phone, email, "addressLine1", city, country, active)
    VALUES (gen_random_uuid(), 'Curo Medical Center', 'clinic', '+94112345678', 'info@curo.health', '123 Health Avenue', 'Colombo', 'Sri Lanka', true)
    RETURNING id
  `);
  const orgId = org.id;
  console.log('✅ Organization created');

  // ---- SUPER ADMIN USER ----
  const [adminUser] = await db.query(`
    INSERT INTO users (id, email, "passwordHash", role, "isActive")
    VALUES (gen_random_uuid(), 'admin@curo.health', $1, 'SUPER_ADMIN', true)
    RETURNING id
  `, [HASH('Admin@12345')]);
  console.log('✅ Super admin created — admin@curo.health / Admin@12345');

  // ---- DOCTORS ----
  const doctors = [
    { firstName: 'Priya', lastName: 'Rajapaksa', email: 'dr.priya@curo.health', specialization: 'General Medicine', qualification: 'MBBS, MD', licenseNumber: 'SLMC-001' },
    { firstName: 'Ashan', lastName: 'Fernando', email: 'dr.ashan@curo.health', specialization: 'Cardiology', qualification: 'MBBS, MD (Cardiology)', licenseNumber: 'SLMC-002' },
    { firstName: 'Nimal', lastName: 'Perera', email: 'dr.nimal@curo.health', specialization: 'Pediatrics', qualification: 'MBBS, DCH', licenseNumber: 'SLMC-003' },
  ];

  const doctorIds: string[] = [];
  const doctorUserIds: string[] = [];
  for (const d of doctors) {
    const [prac] = await db.query(`
      INSERT INTO practitioners (id, "firstName", "lastName", email, gender, role, specialization, qualification, "licenseNumber", "organizationId", active)
      VALUES (gen_random_uuid(), $1, $2, $3, 'unknown', 'DOCTOR', $4, $5, $6, $7, true)
      RETURNING id
    `, [d.firstName, d.lastName, d.email, d.specialization, d.qualification, d.licenseNumber, orgId]);
    const [user] = await db.query(`
      INSERT INTO users (id, email, "passwordHash", role, "practitionerId", "isActive")
      VALUES (gen_random_uuid(), $1, $2, 'DOCTOR', $3, true)
      RETURNING id
    `, [d.email, HASH('Doctor@123'), prac.id]);
    await db.query(`UPDATE practitioners SET "userId" = $1 WHERE id = $2`, [user.id, prac.id]);
    doctorIds.push(prac.id);
    doctorUserIds.push(user.id);
  }
  console.log('✅ 3 doctors created');

  // ---- RECEPTIONISTS ----
  const receptionists = [
    { firstName: 'Chamali', lastName: 'Silva', email: 'chamali@curo.health' },
    { firstName: 'Dinesh', lastName: 'Wijeratne', email: 'dinesh@curo.health' },
  ];
  const receptionistIds: string[] = [];
  for (const r of receptionists) {
    const [prac] = await db.query(`
      INSERT INTO practitioners (id, "firstName", "lastName", email, gender, role, "organizationId", active)
      VALUES (gen_random_uuid(), $1, $2, $3, 'unknown', 'RECEPTIONIST', $4, true)
      RETURNING id
    `, [r.firstName, r.lastName, r.email, orgId]);
    const [user] = await db.query(`
      INSERT INTO users (id, email, "passwordHash", role, "practitionerId", "isActive")
      VALUES (gen_random_uuid(), $1, $2, 'RECEPTIONIST', $3, true)
      RETURNING id
    `, [r.email, HASH('Recept@123'), prac.id]);
    await db.query(`UPDATE practitioners SET "userId" = $1 WHERE id = $2`, [user.id, prac.id]);
    receptionistIds.push(prac.id);
  }
  console.log('✅ 2 receptionists created');

  // ---- PHARMACISTS ----
  const pharmacists = [
    { firstName: 'Kasun', lastName: 'Bandara', email: 'kasun.pharma@curo.health' },
    { firstName: 'Niluka', lastName: 'Mendis', email: 'niluka.pharma@curo.health' },
  ];
  const pharmacistIds: string[] = [];
  for (const p of pharmacists) {
    const [prac] = await db.query(`
      INSERT INTO practitioners (id, "firstName", "lastName", email, gender, role, "organizationId", active)
      VALUES (gen_random_uuid(), $1, $2, $3, 'unknown', 'PHARMACIST', $4, true)
      RETURNING id
    `, [p.firstName, p.lastName, p.email, orgId]);
    const [user] = await db.query(`
      INSERT INTO users (id, email, "passwordHash", role, "practitionerId", "isActive")
      VALUES (gen_random_uuid(), $1, $2, 'PHARMACIST', $3, true)
      RETURNING id
    `, [p.email, HASH('Pharma@123'), prac.id]);
    await db.query(`UPDATE practitioners SET "userId" = $1 WHERE id = $2`, [user.id, prac.id]);
    pharmacistIds.push(prac.id);
  }
  console.log('✅ 2 pharmacists created');

  // ---- LAB STAFF ----
  const labStaff = [
    { firstName: 'Tharindi', lastName: 'Jayawardena', email: 'tharindi.lab@curo.health' },
    { firstName: 'Rukshan', lastName: 'Gunasekara', email: 'rukshan.lab@curo.health' },
  ];
  const labStaffIds: string[] = [];
  for (const l of labStaff) {
    const [prac] = await db.query(`
      INSERT INTO practitioners (id, "firstName", "lastName", email, gender, role, "organizationId", active)
      VALUES (gen_random_uuid(), $1, $2, $3, 'unknown', 'LAB_STAFF', $4, true)
      RETURNING id
    `, [l.firstName, l.lastName, l.email, orgId]);
    const [user] = await db.query(`
      INSERT INTO users (id, email, "passwordHash", role, "practitionerId", "isActive")
      VALUES (gen_random_uuid(), $1, $2, 'LAB_STAFF', $3, true)
      RETURNING id
    `, [l.email, HASH('LabStaff@123'), prac.id]);
    await db.query(`UPDATE practitioners SET "userId" = $1 WHERE id = $2`, [user.id, prac.id]);
    labStaffIds.push(prac.id);
  }
  console.log('✅ 2 lab staff created');

  // ---- PATIENTS ----
  const patientData = [
    { fn: 'Samantha', ln: 'Wijesekara', dob: '1985-03-12', gender: 'female', nic: '852728456V', phone: '+94771234567', email: 'samantha@email.com', blood: 'A+', city: 'Colombo' },
    { fn: 'Roshan', ln: 'Kumara', dob: '1972-07-25', gender: 'male', nic: '727066789V', phone: '+94772345678', email: 'roshan@email.com', blood: 'B+', city: 'Kandy' },
    { fn: 'Amali', ln: 'Dissanayake', dob: '1990-11-03', gender: 'female', nic: '902789123V', phone: '+94773456789', email: 'amali@email.com', blood: 'O+', city: 'Galle' },
    { fn: 'Tharaka', ln: 'Pathirana', dob: '1968-05-18', gender: 'male', nic: '683399456V', phone: '+94774567890', email: 'tharaka@email.com', blood: 'AB+', city: 'Colombo' },
    { fn: 'Ishani', ln: 'Rajapaksa', dob: '1995-09-22', gender: 'female', nic: '952657890V', phone: '+94775678901', email: 'ishani@email.com', blood: 'A-', city: 'Negombo' },
    { fn: 'Buddhika', ln: 'Senanayake', dob: '1980-01-30', gender: 'male', nic: '800301234V', phone: '+94776789012', email: 'buddhika@email.com', blood: 'O-', city: 'Colombo' },
    { fn: 'Malsha', ln: 'Jayasinghe', dob: '2000-06-14', gender: 'female', nic: '002657123V', phone: '+94777890123', email: 'malsha@email.com', blood: 'B-', city: 'Matara' },
    { fn: 'Lasantha', ln: 'Gunatilake', dob: '1955-12-08', gender: 'male', nic: '554998789V', phone: '+94778901234', email: 'lasantha@email.com', blood: 'A+', city: 'Colombo' },
    { fn: 'Nadeeka', ln: 'Wickramasinghe', dob: '1978-04-20', gender: 'female', nic: '783114567V', phone: '+94779012345', email: 'nadeeka@email.com', blood: 'AB-', city: 'Kurunegala' },
    { fn: 'Chanuka', ln: 'Madusanka', dob: '1988-08-15', gender: 'male', nic: '883276789V', phone: '+94770123456', email: 'chanuka@email.com', blood: 'O+', city: 'Colombo' },
  ];

  const patientIds: string[] = [];
  const patientUserIds: string[] = [];
  for (const p of patientData) {
    const code = genCode();
    const [patient] = await db.query(`
      INSERT INTO patients (id, "patientCode", "firstName", "lastName", "birthDate", gender, nic, phone, email, "bloodType", city, country, active)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Sri Lanka', true)
      RETURNING id
    `, [code, p.fn, p.ln, p.dob, p.gender, p.nic, p.phone, p.email, p.blood, p.city]);
    const [user] = await db.query(`
      INSERT INTO users (id, email, "passwordHash", role, "patientId", "isActive")
      VALUES (gen_random_uuid(), $1, $2, 'PATIENT', $3, true)
      RETURNING id
    `, [p.email, HASH('Patient@123'), patient.id]);
    await db.query(`UPDATE patients SET "userId" = $1 WHERE id = $2`, [user.id, patient.id]);
    patientIds.push(patient.id);
    patientUserIds.push(user.id);
  }
  console.log('✅ 10 patients created');

  // ---- ALLERGIES ----
  const allergyData = [
    { patientIdx: 0, code: 'amoxicillin', display: 'Amoxicillin', type: 'allergy', crit: 'high', cat: 'medication', status: 'active' },
    { patientIdx: 1, code: 'penicillin', display: 'Penicillin', type: 'allergy', crit: 'high', cat: 'medication', status: 'active' },
    { patientIdx: 2, code: 'peanut', display: 'Peanuts', type: 'allergy', crit: 'high', cat: 'food', status: 'active' },
    { patientIdx: 3, code: 'aspirin', display: 'Aspirin', type: 'intolerance', crit: 'low', cat: 'medication', status: 'active' },
    { patientIdx: 4, code: 'lactose', display: 'Lactose', type: 'intolerance', crit: 'low', cat: 'food', status: 'active' },
    { patientIdx: 5, code: 'sulfa', display: 'Sulfonamides', type: 'allergy', crit: 'high', cat: 'medication', status: 'active' },
  ];
  for (const a of allergyData) {
    await db.query(`
      INSERT INTO allergy_intolerances (id, "patientId", "practitionerId", type, criticality, code, display, category, "clinicalStatus", "verificationStatus")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
    `, [patientIds[a.patientIdx], rnd(doctorIds), a.type, a.crit, a.code, a.display, a.cat, a.status]);
  }
  console.log('✅ Allergies created');

  // ---- CONDITIONS ----
  const conditionData = [
    { pIdx: 0, code: 'E11', display: 'Type 2 Diabetes Mellitus', status: 'active', cat: 'problem-list-item' },
    { pIdx: 0, code: 'I10', display: 'Essential Hypertension', status: 'active', cat: 'problem-list-item' },
    { pIdx: 1, code: 'I25.1', display: 'Atherosclerotic Heart Disease', status: 'active', cat: 'problem-list-item' },
    { pIdx: 2, code: 'J45.9', display: 'Asthma, Unspecified', status: 'active', cat: 'problem-list-item' },
    { pIdx: 3, code: 'M54.5', display: 'Low Back Pain', status: 'active', cat: 'problem-list-item' },
    { pIdx: 4, code: 'F41.1', display: 'Generalized Anxiety Disorder', status: 'active', cat: 'problem-list-item' },
    { pIdx: 5, code: 'K21.0', display: 'GERD with Esophagitis', status: 'active', cat: 'problem-list-item' },
    { pIdx: 6, code: 'J06.9', display: 'Acute Upper Respiratory Infection', status: 'resolved', cat: 'encounter-diagnosis' },
    { pIdx: 7, code: 'I50.9', display: 'Heart Failure, Unspecified', status: 'active', cat: 'problem-list-item' },
    { pIdx: 8, code: 'N18.3', display: 'Chronic Kidney Disease, Stage 3', status: 'active', cat: 'problem-list-item' },
  ];
  for (const c of conditionData) {
    await db.query(`
      INSERT INTO conditions (id, "patientId", "practitionerId", "clinicalStatus", "verificationStatus", category, code, display)
      VALUES (gen_random_uuid(), $1, $2, $3, 'confirmed', $4, $5, $6)
    `, [patientIds[c.pIdx], rnd(doctorIds), c.status, c.cat, c.code, c.display]);
  }
  console.log('✅ Conditions created');

  // ---- APPOINTMENTS ----
  const appointmentRows: any[] = [];
  for (let i = 0; i < 20; i++) {
    const patIdx = i % 10;
    const docIdx = i % 3;
    const daysOffset = i < 10 ? -(i + 1) : (i - 10 + 1);
    const startHour = 9 + (i % 6);
    const start = daysAgo(-daysOffset);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(30);
    const isPast = daysOffset < 0;
    const status = isPast ? (Math.random() > 0.2 ? 'fulfilled' : 'noshow') : 'booked';
    const [appt] = await db.query(`
      INSERT INTO appointments (id, "patientId", "practitionerId", status, start, "end", description, "serviceType", "slotNumber")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'General Consultation', $7)
      RETURNING id
    `, [patientIds[patIdx], doctorIds[docIdx], status, start, end, `Appointment for ${patientData[patIdx].fn} ${patientData[patIdx].ln}`, i + 1]);
    appointmentRows.push({ id: appt.id, patientId: patientIds[patIdx], practitionerId: doctorIds[docIdx], isPast });
  }
  console.log('✅ 20 appointments created');

  // ---- ENCOUNTERS ----
  const encounterIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const appt = appointmentRows.filter(a => a.isPast)[i];
    if (!appt) continue;
    const start = daysAgo(i + 1);
    const [enc] = await db.query(`
      INSERT INTO encounters (id, "patientId", "practitionerId", "appointmentId", status, "classCode", "serviceType", "periodStart", "periodEnd")
      VALUES (gen_random_uuid(), $1, $2, $3, 'completed', 'AMB', 'General Consultation', $4, $5)
      RETURNING id
    `, [appt.patientId, appt.practitionerId, appt.id, start, new Date(start.getTime() + 1800000)]);
    encounterIds.push(enc.id);

    await db.query(`UPDATE appointments SET "encounterId" = $1 WHERE id = $2`, [enc.id, appt.id]);

    // Clinical note
    await db.query(`
      INSERT INTO clinical_notes (id, "encounterId", "patientId", "practitionerId", subjective, objective, assessment, plan)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
    `, [
      enc.id, appt.patientId, appt.practitionerId,
      'Patient reports mild discomfort and fatigue for the past 3 days.',
      `BP: 120/80 mmHg, HR: 78 bpm, Temp: 37.1°C, SpO2: 98%. Patient appears well.`,
      `Stable condition. Vitals within normal range.`,
      `Continue current medications. Follow up in 2 weeks. Monitor symptoms.`,
    ]);

    // Vitals
    const vitalSets = [
      { code: '8480-6', display: 'Systolic Blood Pressure', value: 115 + Math.floor(Math.random() * 20), unit: 'mmHg' },
      { code: '8462-4', display: 'Diastolic Blood Pressure', value: 70 + Math.floor(Math.random() * 15), unit: 'mmHg' },
      { code: '8867-4', display: 'Heart Rate', value: 68 + Math.floor(Math.random() * 20), unit: '/min' },
      { code: '8310-5', display: 'Body Temperature', value: 36.5 + Math.random() * 1, unit: '°C' },
      { code: '2708-6', display: 'Oxygen Saturation', value: 96 + Math.floor(Math.random() * 4), unit: '%' },
    ];
    for (const v of vitalSets) {
      await db.query(`
        INSERT INTO observations (id, "patientId", "practitionerId", "encounterId", status, category, code, display, "valueQuantity", "valueUnit", "effectiveDateTime")
        VALUES (gen_random_uuid(), $1, $2, $3, 'final', 'vital-signs', $4, $5, $6, $7, $8)
      `, [appt.patientId, appt.practitionerId, enc.id, v.code, v.display, v.value, v.unit, start]);
    }
  }
  console.log('✅ 10 encounters + notes + vitals created');

  // ---- PRESCRIPTIONS ----
  const medications = [
    { code: 'metformin-500mg', display: 'Metformin 500mg', dosage: '1 tablet twice daily', route: 'oral', freq: 'BID', qty: 60, unit: 'tablets' },
    { code: 'amlodipine-5mg', display: 'Amlodipine 5mg', dosage: '1 tablet once daily', route: 'oral', freq: 'QD', qty: 30, unit: 'tablets' },
    { code: 'atorvastatin-20mg', display: 'Atorvastatin 20mg', dosage: '1 tablet at night', route: 'oral', freq: 'QN', qty: 30, unit: 'tablets' },
    { code: 'omeprazole-20mg', display: 'Omeprazole 20mg', dosage: '1 capsule before meals', route: 'oral', freq: 'BID', qty: 60, unit: 'capsules' },
    { code: 'salbutamol-inhaler', display: 'Salbutamol Inhaler 100mcg', dosage: '2 puffs when needed', route: 'inhalation', freq: 'PRN', qty: 1, unit: 'inhaler' },
    { code: 'losartan-50mg', display: 'Losartan 50mg', dosage: '1 tablet once daily', route: 'oral', freq: 'QD', qty: 30, unit: 'tablets' },
    { code: 'paracetamol-500mg', display: 'Paracetamol 500mg', dosage: '1-2 tablets every 6 hours', route: 'oral', freq: 'Q6H PRN', qty: 20, unit: 'tablets' },
    { code: 'amoxicillin-250mg', display: 'Amoxicillin 250mg', dosage: '1 capsule three times daily', route: 'oral', freq: 'TID', qty: 21, unit: 'capsules' },
  ];

  const prescriptionIds: string[] = [];
  for (let i = 0; i < 8; i++) {
    const med = medications[i];
    const encId = encounterIds[i % encounterIds.length];
    const pIdx = i % 10;
    const isCompleted = i < 5;
    const authoredOn = daysAgo(i + 1);
    const [rx] = await db.query(`
      INSERT INTO medication_requests (id, "patientId", "practitionerId", "encounterId", status, intent, "medicationCode", "medicationDisplay", "dosageText", route, frequency, "quantityValue", "quantityUnit", "durationDays", "authoredOn")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'order', $5, $6, $7, $8, $9, $10, $11, 30, $12)
      RETURNING id
    `, [
      patientIds[pIdx], rnd(doctorIds), encId || null,
      isCompleted ? 'completed' : 'active',
      med.code, med.display, med.dosage, med.route, med.freq, med.qty, med.unit, authoredOn,
    ]);
    prescriptionIds.push(rx.id);
  }
  console.log('✅ 8 prescriptions created');

  // ---- LAB ORDERS + QR CODES ----
  const labTests = [
    { code: '58410-2', display: 'CBC (Complete Blood Count)', panel: [{ code: '30521-6', display: 'RBC' }, { code: '26515-7', display: 'Platelets' }, { code: '718-7', display: 'Hemoglobin' }] },
    { code: '24323-8', display: 'Comprehensive Metabolic Panel', panel: [{ code: '2345-7', display: 'Glucose' }, { code: '6299-2', display: 'BUN' }, { code: '2160-0', display: 'Creatinine' }] },
    { code: '55080-1', display: 'Lipid Panel', panel: [{ code: '2093-3', display: 'Total Cholesterol' }, { code: '2085-9', display: 'HDL' }, { code: '13457-7', display: 'LDL' }] },
    { code: '17856-6', display: 'HbA1c', panel: [{ code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin' }] },
    { code: '5902-2', display: 'Prothrombin Time (PT)', panel: [{ code: '5902-2', display: 'PT' }] },
    { code: '14749-6', display: 'Glucose Fasting', panel: [{ code: '14749-6', display: 'Fasting Glucose' }] },
    { code: '2532-0', display: 'Lactate Dehydrogenase (LDH)', panel: [{ code: '2532-0', display: 'LDH' }] },
    { code: '10334-1', display: 'Thyroid Stimulating Hormone (TSH)', panel: [{ code: '3016-3', display: 'TSH' }] },
  ];

  const labOrderIds: string[] = [];
  for (let i = 0; i < 8; i++) {
    const test = labTests[i];
    const pIdx = i % 10;
    const isCompleted = i < 5;
    const authoredOn = daysAgo(i + 2);
    const gatewayUrl = `http://localhost:3000`;

    const [order] = await db.query(`
      INSERT INTO service_requests (id, "patientId", "requesterId", status, intent, category, code, display, "testPanel", priority, "authoredOn")
      VALUES (gen_random_uuid(), $1, $2, $3, 'order', 'laboratory', $4, $5, $6, 'routine', $7)
      RETURNING id
    `, [
      patientIds[pIdx], rnd(doctorIds),
      isCompleted ? 'completed' : 'active',
      test.code, test.display, JSON.stringify(test.panel), authoredOn,
    ]);

    // Generate QR code
    const qrUrl = `${gatewayUrl}/lab/orders/${order.id}`;
    const imageBase64 = await QRCode.toDataURL(qrUrl);
    const [qr] = await db.query(`
      INSERT INTO qr_codes (id, "serviceRequestId", "encodedUrl", "imageBase64")
      VALUES (gen_random_uuid(), $1, $2, $3)
      RETURNING id
    `, [order.id, qrUrl, imageBase64]);
    await db.query(`UPDATE service_requests SET "qrCodeId" = $1 WHERE id = $2`, [qr.id, order.id]);

    if (isCompleted) {
      await db.query(`UPDATE service_requests SET "receivedAt" = $1, "completedAt" = $2, "performerId" = $3 WHERE id = $4`, [
        daysAgo(i + 1), daysAgo(i), rnd(labStaffIds), order.id,
      ]);
    }

    labOrderIds.push(order.id);
  }
  console.log('✅ 8 lab orders with QR codes created');

  // ---- DIAGNOSTIC REPORTS (for completed orders) ----
  for (let i = 0; i < 5; i++) {
    const test = labTests[i];
    const order = (await db.query(`SELECT * FROM service_requests WHERE id = $1`, [labOrderIds[i]]))[0];
    const results = test.panel.map(t => ({
      code: t.code,
      display: t.display,
      value: Math.round(Math.random() * 100 + 50) / 10,
      unit: 'units',
      interpretation: Math.random() > 0.7 ? 'H' : 'N',
      referenceRangeLow: '5.0',
      referenceRangeHigh: '15.0',
    }));
    await db.query(`
      INSERT INTO diagnostic_reports (id, "patientId", "serviceRequestId", "performerId", status, code, display, results, conclusion, "effectiveDateTime", issued)
      VALUES (gen_random_uuid(), $1, $2, $3, 'final', $4, $5, $6, $7, $8, $9)
    `, [
      order.patientId, labOrderIds[i], rnd(labStaffIds),
      test.code, test.display, JSON.stringify(results),
      'Results within acceptable range. No immediate action required.',
      daysAgo(i), daysAgo(i),
    ]);
  }
  console.log('✅ 5 diagnostic reports created');

  // ---- DISPENSE RECORDS ----
  for (let i = 0; i < 5; i++) {
    const rxId = prescriptionIds[i];
    const rx = (await db.query(`SELECT * FROM medication_requests WHERE id = $1`, [rxId]))[0];
    await db.query(`
      INSERT INTO medication_dispenses (id, "medicationRequestId", "patientId", "pharmacistId", status, "medicationCode", "medicationDisplay", "quantityValue", "quantityUnit", "dispenserName", "unitPrice", "totalPrice", "receiptNumber", "whenHandedOver")
      VALUES (gen_random_uuid(), $1, $2, $3, 'completed', $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      rxId, rx.patientId, rnd(pharmacistIds), rx.medicationCode, rx.medicationDisplay,
      rx.quantityValue || 30, rx.quantityUnit || 'tablets', 'Kasun Bandara',
      50, (rx.quantityValue || 30) * 50,
      `RX-${Date.now()}-${i}`, daysAgo(i),
    ]);
  }
  console.log('✅ 5 dispense records created');

  // ---- PHARMACY STOCK ----
  const stockData = [
    { code: 'metformin-500mg', name: 'Metformin 500mg', generic: 'Metformin', form: 'tablet', strength: '500mg', qty: 500, unit: 'tablets', expiry: '2026-12-31', threshold: 50, price: 5.5 },
    { code: 'amlodipine-5mg', name: 'Amlodipine 5mg', generic: 'Amlodipine', form: 'tablet', strength: '5mg', qty: 300, unit: 'tablets', expiry: '2026-12-31', threshold: 30, price: 12.0 },
    { code: 'atorvastatin-20mg', name: 'Atorvastatin 20mg', generic: 'Atorvastatin', form: 'tablet', strength: '20mg', qty: 200, unit: 'tablets', expiry: '2027-06-30', threshold: 30, price: 18.5 },
    { code: 'omeprazole-20mg', name: 'Omeprazole 20mg', generic: 'Omeprazole', form: 'capsule', strength: '20mg', qty: 250, unit: 'capsules', expiry: '2026-09-30', threshold: 25, price: 8.0 },
    { code: 'salbutamol-inhaler', name: 'Salbutamol Inhaler 100mcg', generic: 'Salbutamol', form: 'inhaler', strength: '100mcg/puff', qty: 40, unit: 'inhalers', expiry: '2026-08-31', threshold: 5, price: 320.0 },
    { code: 'losartan-50mg', name: 'Losartan 50mg', generic: 'Losartan', form: 'tablet', strength: '50mg', qty: 150, unit: 'tablets', expiry: '2027-01-31', threshold: 20, price: 15.0 },
    { code: 'paracetamol-500mg', name: 'Paracetamol 500mg', generic: 'Paracetamol', form: 'tablet', strength: '500mg', qty: 1000, unit: 'tablets', expiry: '2027-03-31', threshold: 100, price: 3.0 },
    { code: 'amoxicillin-250mg', name: 'Amoxicillin 250mg', generic: 'Amoxicillin', form: 'capsule', strength: '250mg', qty: 8, unit: 'capsules', expiry: '2026-05-31', threshold: 30, price: 22.0 },
    { code: 'cetirizine-10mg', name: 'Cetirizine 10mg', generic: 'Cetirizine', form: 'tablet', strength: '10mg', qty: 100, unit: 'tablets', expiry: '2027-02-28', threshold: 20, price: 6.5 },
    { code: 'pantoprazole-40mg', name: 'Pantoprazole 40mg', generic: 'Pantoprazole', form: 'tablet', strength: '40mg', qty: 5, unit: 'tablets', expiry: '2025-12-31', threshold: 20, price: 14.0 },
    { code: 'metoprolol-50mg', name: 'Metoprolol 50mg', generic: 'Metoprolol', form: 'tablet', strength: '50mg', qty: 120, unit: 'tablets', expiry: '2026-11-30', threshold: 20, price: 11.0 },
    { code: 'aspirin-75mg', name: 'Aspirin 75mg', generic: 'Aspirin', form: 'tablet', strength: '75mg', qty: 600, unit: 'tablets', expiry: '2027-06-30', threshold: 50, price: 4.0 },
    { code: 'diclofenac-50mg', name: 'Diclofenac 50mg', generic: 'Diclofenac', form: 'tablet', strength: '50mg', qty: 80, unit: 'tablets', expiry: '2026-10-31', threshold: 15, price: 9.0 },
    { code: 'furosemide-40mg', name: 'Furosemide 40mg', generic: 'Furosemide', form: 'tablet', strength: '40mg', qty: 3, unit: 'tablets', expiry: '2026-07-31', threshold: 30, price: 7.0 },
    { code: 'vitamin-d3', name: 'Vitamin D3 1000IU', generic: 'Cholecalciferol', form: 'capsule', strength: '1000IU', qty: 200, unit: 'capsules', expiry: '2027-12-31', threshold: 30, price: 25.0 },
    { code: 'insulin-glargine', name: 'Insulin Glargine 100U/ml', generic: 'Insulin Glargine', form: 'injection', strength: '100U/ml', qty: 25, unit: 'vials', expiry: '2026-06-30', threshold: 5, price: 1800.0 },
    { code: 'lisinopril-10mg', name: 'Lisinopril 10mg', generic: 'Lisinopril', form: 'tablet', strength: '10mg', qty: 90, unit: 'tablets', expiry: '2027-01-31', threshold: 20, price: 13.5 },
    { code: 'simvastatin-20mg', name: 'Simvastatin 20mg', generic: 'Simvastatin', form: 'tablet', strength: '20mg', qty: 60, unit: 'tablets', expiry: '2026-12-31', threshold: 20, price: 16.0 },
    { code: 'azithromycin-500mg', name: 'Azithromycin 500mg', generic: 'Azithromycin', form: 'tablet', strength: '500mg', qty: 12, unit: 'tablets', expiry: '2026-09-30', threshold: 10, price: 45.0 },
    { code: 'clopidogrel-75mg', name: 'Clopidogrel 75mg', generic: 'Clopidogrel', form: 'tablet', strength: '75mg', qty: 90, unit: 'tablets', expiry: '2027-03-31', threshold: 20, price: 28.0 },
  ];

  for (const s of stockData) {
    await db.query(`
      INSERT INTO stock (id, "medicationCode", "medicationName", "genericName", form, strength, quantity, unit, "expiryDate", "reorderThreshold", "unitPrice", active)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
    `, [s.code, s.name, s.generic, s.form, s.strength, s.qty, s.unit, s.expiry, s.threshold, s.price]);
  }
  console.log('✅ 20 pharmacy stock items created');

  // ---- LAB INSTRUMENTS ----
  const instruments = [
    { name: 'Sysmex XN-550', model: 'XN-550', manufacturer: 'Sysmex', serial: 'SYS-XN-2023-001', category: 'hematology', status: 'operational', location: 'Lab Room 1' },
    { name: 'Beckman AU480', model: 'AU480', manufacturer: 'Beckman Coulter', serial: 'BCK-AU-2022-002', category: 'chemistry', status: 'operational', location: 'Lab Room 2' },
  ];
  for (const inst of instruments) {
    await db.query(`
      INSERT INTO lab_instruments (id, name, model, manufacturer, "serialNumber", status, location, category, "lastMaintenanceDate")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
    `, [inst.name, inst.model, inst.manufacturer, inst.serial, inst.status, inst.location, inst.category, '2026-01-15']);
  }
  console.log('✅ 2 lab instruments created');

  // ---- NOTIFICATIONS ----
  const notifications = [
    { recipientId: patientUserIds[0], eventType: 'lab_results_ready', title: 'Lab Results Ready', message: 'Your CBC lab results are ready. Please log in to view.' },
    { recipientId: patientUserIds[1], eventType: 'appointment_confirmed', title: 'Appointment Confirmed', message: 'Your appointment with Dr. Fernando has been confirmed.' },
    { recipientId: patientUserIds[2], eventType: 'prescription_ready', title: 'Prescription Ready', message: 'Your prescription is ready for collection at the pharmacy.' },
  ];
  for (const n of notifications) {
    await db.query(`
      INSERT INTO notifications (id, "recipientId", "eventType", title, message, "isRead")
      VALUES (gen_random_uuid(), $1, $2, $3, $4, false)
    `, [n.recipientId, n.eventType, n.title, n.message]);
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
  console.log('   Patients:     samantha@email.com       / Patient@123 (and others)');
}

seed().catch(e => { console.error('Seed failed:', e); process.exit(1); });
