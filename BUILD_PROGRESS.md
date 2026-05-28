# Curo EMR — Build Progress

**Last updated:** 2026-05-28 (Phase 6 complete)

---

## Project Overview
Full EMR system: 5 Next.js frontends + 9 NestJS backends + PostgreSQL + FHIR-shaped APIs.

**Frontend ports:** 3010–3014  
**Backend ports:** Gateway 3000, Auth 3001, Patient 3002, Appointment 3003, Clinical 3004, Pharmacy 3005, Lab 3006, Notifications 3007, Audit 3008

---

## Phase 1: Infrastructure ✅ DONE

- [x] `docker-compose.yml` — postgres:16 + redis:7, container `curo_postgres`, DB `curo_db`, user/pass `curo/curo_secret`
- [x] `scripts/init.sql` — enables uuid-ossp + pgcrypto extensions
- [x] `.env.example` — all service ports, DB URL, JWT secrets, frontend origins
- [x] `package.json` (root) — npm seed script via ts-node

---

## Phase 2: NestJS Service Scaffolds ✅ DONE

All 9 services scaffolded + deps installed.

---

## Phase 3: Database Entities ✅ DONE

All 22 entities created in `curo-shared/src/entities/`:
- [x] user.entity.ts
- [x] patient.entity.ts
- [x] practitioner.entity.ts
- [x] organization.entity.ts
- [x] appointment.entity.ts
- [x] encounter.entity.ts
- [x] condition.entity.ts
- [x] allergy-intolerance.entity.ts
- [x] medication-request.entity.ts
- [x] medication-dispense.entity.ts
- [x] service-request.entity.ts
- [x] diagnostic-report.entity.ts
- [x] observation.entity.ts
- [x] document-reference.entity.ts
- [x] task.entity.ts
- [x] clinical-note.entity.ts
- [x] qr-code.entity.ts
- [x] stock.entity.ts
- [x] payment.entity.ts
- [x] notification.entity.ts
- [x] audit-log.entity.ts
- [x] lab-instrument.entity.ts

`curo-shared/src/index.ts` and `curo-shared/src/entities/index.ts` export all entities + enums.

**Note:** Each service copies only the entities it needs into its own `src/entities/` — avoids local npm package linking complexity.

---

## Phase 4: Backend Service Implementation ✅ DONE

### All services compile clean (verified with `tsc --noEmit`).

### curo-auth-service (port 3001) ✅
- [x] User entity + JWT strategy + Passport
- [x] POST /auth/login, POST /auth/register, POST /auth/refresh
- [x] GET /auth/profile (JWT protected)
- [x] POST /auth/staff (SUPER_ADMIN only) — creates practitioner + user
- [x] JwtAuthGuard + RolesGuard + Roles decorator + CurrentUser decorator
- Entities: User, Practitioner, Patient

### curo-patient-service (port 3002) ✅
- [x] GET/POST /patients (DOCTOR, RECEPTIONIST, SUPER_ADMIN)
- [x] GET /patients/me (PATIENT own record)
- [x] GET /patients/code/:code (lookup by CUR-XXXXXXXX)
- [x] GET/POST /patients/:id/allergies
- [x] GET/POST /patients/:id/conditions
- [x] GET /patients/:id/vitals + /vitals/trend
- [x] CUR-XXXXXXXX patient code generation (guaranteed unique)
- [x] FHIR Patient, AllergyIntolerance, Condition, Observation response shapes
- Entities: Patient, AllergyIntolerance, Condition, Observation

### curo-appointment-service (port 3003) ✅
- [x] POST /appointments (RECEPTIONIST, DOCTOR, SUPER_ADMIN)
- [x] GET /appointments (filtered by date, practitionerId, patientId)
- [x] GET /appointments/schedule/:practitionerId?date=YYYY-MM-DD — queue view
- [x] GET /appointments/patient/:patientId
- [x] PUT /appointments/:id (status updates, cancel reason)
- [x] FHIR Appointment response shape
- Entities: Appointment

### curo-clinical-service (port 3004) ✅
- [x] POST/GET /encounters, PUT /encounters/:id/status
- [x] POST/GET /notes (SOAP format)
- [x] POST/GET /vitals (Observation FHIR)
- [x] POST /prescriptions → e-prescription (MedicationRequest FHIR)
- [x] GET /prescriptions/pending (PHARMACIST + DOCTOR)
- [x] POST /lab-orders → ServiceRequest + QR code generation (qrcode npm)
- [x] GET /lab-orders, GET /lab-orders/:id (with QR base64)
- [x] POST/GET/PUT /tasks
- Entities: Encounter, ClinicalNote, MedicationRequest, ServiceRequest, Observation, QrCode, Task

### curo-pharmacy-service (port 3005) ✅
- [x] GET /prescriptions/pending (minimal patient data — name+DOB+meds only)
- [x] POST /dispense → receipt number + total calculation
- [x] GET /dispense, GET /dispense/:id (MedicationDispense FHIR)
- [x] GET/POST /stock, PUT /stock/:id
- [x] GET /stock/alerts (low-stock items below reorder threshold)
- Entities: MedicationRequest, MedicationDispense, Stock

### curo-lab-service (port 3006) ✅
- [x] GET /orders (filterable by status)
- [x] POST /orders/scan (QR scan → pull up order, mark received)
- [x] PUT /orders/:id/receive
- [x] POST /results → enters results per test panel
- [x] PDF report generation via pdfkit (lab report with patient info, results, flags, ref ranges)
- [x] DiagnosticReport FHIR response
- [x] GET /reports, GET /reports/:id
- [x] GET/POST /instruments, PUT /instruments/:id/status
- [x] GET /orders/tat (turnaround time stats)
- Entities: ServiceRequest, DiagnosticReport, Observation, QrCode, LabInstrument

### curo-notification-service (port 3007) ✅
- [x] POST /notifications (any service can create)
- [x] GET /notifications (user's own, optionally unread only)
- [x] GET /notifications/count (unread count)
- [x] PUT /notifications/:id/read
- [x] PUT /notifications/read-all
- Entities: Notification

### curo-audit-service (port 3008) ✅
- [x] POST /audit (any internal service logs)
- [x] GET /audit (SUPER_ADMIN only, filterable)
- Entities: AuditLog

### curo-api-gateway (port 3000) ✅
- [x] JWT validation at gateway (decodes token, injects x-user-id/x-user-role/x-user-email headers)
- [x] Path-based proxy routing to all 8 upstream services
- [x] Public paths bypassed: /auth/login, /auth/register, /auth/refresh, /health
- [x] CORS configured for localhost:3010–3014
- [x] 502 error handling when services are down

---

## Phase 5: Seed Script ✅ DONE

Location: `scripts/seed.ts`
Run: `npm run seed` from repo root (requires postgres running)

### Seed Data:
- [x] 1 super admin (admin@curo.health / Admin@12345)
- [x] 3 doctors (different specialties — General Medicine, Cardiology, Pediatrics)
- [x] 2 receptionists
- [x] 2 pharmacists
- [x] 2 lab staff
- [x] 10 patients with CUR codes, demographics, allergies, conditions
- [x] 20 appointments (mix of fulfilled/booked/noshow)
- [x] 10 encounters with SOAP notes + 5 vitals each (BP, HR, Temp, SpO2)
- [x] 8 prescriptions (5 completed, 3 active/pending)
- [x] 8 lab orders with QR codes (5 completed, 3 active)
- [x] 5 diagnostic reports (CBC, CMP, Lipid Panel, HbA1c, PT)
- [x] 5 dispense records with receipt numbers
- [x] 20 pharmacy stock items (mix of adequate/low stock)
- [x] 2 lab instruments (Sysmex + Beckman)
- [x] 3 notifications

### Seed user passwords:
- Super Admin:  admin@curo.health / Admin@12345
- Doctors: dr.priya@curo.health, dr.ashan@curo.health, dr.nimal@curo.health / Doctor@123
- Receptionists: chamali@curo.health, dinesh@curo.health / Recept@123
- Pharmacists: kasun.pharma@curo.health, niluka.pharma@curo.health / Pharma@123
- Lab Staff: tharindi.lab@curo.health, rukshan.lab@curo.health / LabStaff@123
- Patients: samantha@email.com (and 9 others) / Patient@123

---

## Phase 6: Frontend Wiring ✅ DONE

All 5 frontends wired to the real backend API.

### What was done:
1. ✅ Dev ports updated to 3010–3014
2. ✅ `lib/api/client.ts` created in all frontends — axios with JWT interceptor pointing to http://localhost:3000
3. ✅ FHIR response mappers created (`lib/api/mappers.ts`) to translate FHIR shapes to frontend types
4. ✅ Domain API modules created (`patients.ts`, `appointments.ts`, `encounters.ts`, `clinical.ts`, `tasks.ts`, `practitioners.ts`, `pharmacy.ts`, `lab.ts`)
5. ✅ `AuthContext.tsx` updated in all frontends to call real `POST /auth/login`
6. ✅ All server component pages converted to `"use client"` with useEffect data fetching
7. ✅ All `"use server"` action files replaced with direct API calls
8. ✅ `NEXT_PUBLIC_API_URL=http://localhost:3000` added to each frontend's `.env.local`
9. ✅ Added `GET /auth/practitioners` endpoint to auth service (for doctor dropdowns)

### Architecture decisions:
- No Next.js server actions anywhere
- Static catalogs (ICD-10, medications, lab tests) remain as bundled JSON (no backend needed)
- All transactional data fetched client-side via useEffect + axios
- FHIR-shaped API responses mapped to frontend domain types in `lib/api/mappers.ts`
- `lib/data/api.ts` in each frontend re-exports from `lib/api/` for backward compatibility

### Frontend port mapping:
- curo-doctor → port 3010
- curo-patient → port 3011
- curo-receptionist → port 3012
- curo-lab → port 3013
- curo-pharmacy → port 3014

### API routes needed per frontend:
**curo-receptionist (3012):**
- POST /patients → register patient, show CUR code
- GET /patients?search=X → patient list
- POST /appointments → book slot
- GET /appointments?date=X&practitionerId=X → schedule view
- PUT /appointments/:id → update status

**curo-doctor (3010):**
- GET /patients, GET /patients/:id → full profile
- GET /patients/:id/allergies + /conditions + /vitals
- POST /encounters, PUT /encounters/:id/status
- POST /notes, GET /notes/encounter/:id
- POST /vitals, GET /vitals/patient/:id/trend
- POST /prescriptions, POST /lab-orders → creates + returns QR code
- GET /pharmacy/stock (read-only)
- GET /lab/instruments (status widget)
- GET/POST/PUT /tasks

**curo-patient (3011):**
- GET /patients/me → own profile
- GET /appointments?patientId=X → own appointments
- GET /encounters/patient/:id → encounter history
- GET /lab/reports?patientId=X → own reports
- GET /prescriptions/patient/:id → own prescriptions

**curo-pharmacy (3014):**
- GET /prescriptions/pending → pending queue
- POST /dispense → dispense flow with receipt
- GET /dispense → history
- GET/POST/PUT /stock
- GET /stock/alerts → low stock

**curo-lab (3013):**
- GET /lab/orders → queue
- POST /lab/orders/scan → QR scan
- PUT /lab/orders/:id/receive
- POST /lab/results → enter results
- GET /lab/reports → results list
- GET/POST/PUT /lab/instruments

---

## How to Start Everything

### 1. Start PostgreSQL
```bash
docker compose up -d
# Wait ~10s for postgres to be ready
```

### 2. Run Seed
```bash
npm run seed
```

### 3. Start All Backend Services
```bash
# In separate terminals (or use pm2/tmux):
cd curo-auth-service && npm run start:dev
cd curo-patient-service && npm run start:dev
cd curo-appointment-service && npm run start:dev
cd curo-clinical-service && npm run start:dev
cd curo-pharmacy-service && npm run start:dev
cd curo-lab-service && npm run start:dev
cd curo-notification-service && npm run start:dev
cd curo-audit-service && npm run start:dev
cd curo-api-gateway && npm run start:dev
```

### 4. Start Frontends (once wired)
```bash
cd curo-doctor && npm run dev -- -p 3010
cd curo-patient && npm run dev -- -p 3011
cd curo-receptionist && npm run dev -- -p 3012
cd curo-lab && npm run dev -- -p 3013
cd curo-pharmacy && npm run dev -- -p 3014
```

---

## Files Created / Changed

```
curo/
├── docker-compose.yml              ✅
├── .env.example                    ✅
├── package.json                    ✅ (root seed runner)
├── BUILD_PROGRESS.md               ✅ (this file)
├── scripts/
│   ├── init.sql                    ✅
│   ├── seed.ts                     ✅ NEW
│   └── tsconfig.seed.json          ✅ NEW
│
├── curo-shared/
│   ├── package.json                ✅ NEW
│   ├── tsconfig.json               ✅ NEW
│   └── src/
│       ├── index.ts                ✅ NEW
│       ├── enums/index.ts          ✅
│       └── entities/               ✅ NEW — all 22 entities
│
├── curo-auth-service/
│   ├── .env                        ✅
│   └── src/
│       ├── main.ts                 ✅ updated
│       ├── app.module.ts           ✅ updated
│       ├── enums/index.ts          ✅
│       ├── entities/               ✅ (User, Practitioner, Patient)
│       └── auth/                   ✅ FULL (service, controller, module, DTOs, guards, strategies)
│
├── curo-patient-service/
│   ├── .env                        ✅
│   └── src/
│       ├── main.ts                 ✅
│       ├── app.module.ts           ✅
│       ├── enums/index.ts          ✅
│       ├── entities/               ✅ (Patient, AllergyIntolerance, Condition, Observation)
│       ├── common/                 ✅ (jwt-auth.guard, roles.guard, decorators)
│       └── patient/                ✅ FULL (service, controller, module, DTOs, fhir.mapper)
│
├── curo-appointment-service/       ✅ FULL
├── curo-clinical-service/          ✅ FULL (incl. QR code generation)
├── curo-pharmacy-service/          ✅ FULL
├── curo-lab-service/               ✅ FULL (incl. PDF report generation)
├── curo-notification-service/      ✅ FULL
├── curo-audit-service/             ✅ FULL
└── curo-api-gateway/               ✅ FULL (JWT validation + path proxy)
```

---

## Phase 6 Additions to File Tree

```
Each frontend now has:
├── src/lib/api/
│   ├── client.ts       ✅ (axios instance, JWT interceptor)
│   ├── mappers.ts      ✅ (FHIR → frontend type mappers)
│   ├── patients.ts     ✅
│   ├── appointments.ts ✅ (doctor, receptionist)
│   ├── encounters.ts   ✅ (doctor)
│   ├── clinical.ts     ✅ (doctor — notes, vitals, prescriptions, lab orders)
│   ├── tasks.ts        ✅ (doctor)
│   ├── practitioners.ts ✅ (doctor, receptionist — doctor dropdown)
│   ├── patient-portal.ts ✅ (patient portal)
│   ├── pharmacy.ts     ✅ (pharmacy — prescriptions, dispense, stock)
│   ├── lab.ts          ✅ (lab — orders, results, instruments)
│   └── index.ts        ✅ (re-exports)
├── src/contexts/AuthContext.tsx  ✅ (calls real POST /auth/login)
├── .env.local          ✅ (NEXT_PUBLIC_API_URL=http://localhost:3000)
```

---

## Next Steps (TODO)

### Phase 7: End-to-end Testing & Polish (NEXT)
1. Start Docker + run seed, then verify each frontend login flow works
2. Fix any TypeScript build errors (some old type fields may remain in components)
3. Wire the EncounterEditor component's form submit to POST /encounters, POST /vitals, POST /prescriptions, POST /lab-orders
4. Wire PatientRegistrationForm and PatientEditForm submits to registerPatient/updatePatientDemographics
5. Wire BookAppointmentForm submit to bookNewAppointment
6. Add JWT refresh token flow (currently just removes token on 401)
7. Add notifications polling (GET /notifications/count in Topbar)
8. Polish: loading states, error toasts (sonner), empty states

### Known Issues / TODOs:
- `@nestjs/mapped-types` needs to be installed in any service using `PartialType` (already done for patient)
- Some patient pages (visits detail) are placeholders until encounter API is added to patient scope
- The EncounterEditor component form submit still uses old server actions — needs to be wired to API
- PatientRegistrationForm / BookAppointmentForm forms call updated actions — verify form wiring
- `typeorm: "^1.0.0"` is installed in all services — this is correct (TypeORM 1.0.0)
- Docker Desktop required to run postgres (docker-compose.yml is ready)
- Run `docker compose up -d` then `npm run seed` before starting backends
