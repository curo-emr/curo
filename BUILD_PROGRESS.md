# Curo EMR — Build Progress

**Last updated:** 2026-06-05 (Phase 9 complete — full dockerized stack + e2e API verification)

---

## Architecture: domain-driven, not role-driven

The backend is split by **clinical domain**, not by UI role. This is why there is
**no `curo-doctor-service` or `curo-receptionist-service`** — "doctor" and
"receptionist" are UI roles that *compose* multiple domain services:

| Frontend            | Backend services it calls                                  |
|---------------------|------------------------------------------------------------|
| curo-doctor (3010)  | auth, patient, appointment, **clinical**, notification     |
| curo-receptionist (3012) | auth, patient, appointment, notification              |
| curo-patient (3011) | auth, patient, appointment, clinical                       |
| curo-lab (3013)     | patient, **lab**                                           |
| curo-pharmacy (3014)| patient, **pharmacy**                                      |

`lab`/`pharmacy` only *look* 1:1 because those roles happen to map to a single
domain. Doctor and receptionist are cross-domain, so they have no dedicated
service. Splitting clinical/appointment logic into role services would duplicate
domain logic — a known microservice anti-pattern. **Decision: keep domain-driven.**

FHIR scope: **pragmatic FHIR-shaped** — every clinical resource carries
`resourceType` + correct core R4 fields and reference/coding structures; custom
fields go in `extension`. Not validated against full R4 profiles. The
`GET /auth/practitioners` endpoint intentionally returns a compact UI-helper
shape (not a FHIR `Practitioner` resource) consumed by frontend dropdowns.

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

All 22 entities created in `packages/shared/src/entities/`:
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

`packages/shared/src/index.ts` and `packages/shared/src/entities/index.ts` export all entities + enums.

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
# Once, at the repo root: installs every backend (npm workspaces) and builds
# @curo/shared, which the services import. Rebuild it after changing it
# (or keep `npm run build:watch -w @curo/shared` running).
npm install
npm run build:shared

# In separate terminals (or use pm2/tmux):
cd services/auth && npm run start:dev
cd services/patient && npm run start:dev
cd services/appointment && npm run start:dev
cd services/clinical && npm run start:dev
cd services/pharmacy && npm run start:dev
cd services/lab && npm run start:dev
cd services/notification && npm run start:dev
cd services/audit && npm run start:dev
cd services/api-gateway && npm run start:dev
```

### 4. Start Frontends (once wired)
```bash
cd apps/doctor && npm run dev -- -p 3010
cd apps/patient && npm run dev -- -p 3011
cd apps/receptionist && npm run dev -- -p 3012
cd apps/lab && npm run dev -- -p 3013
cd apps/pharmacy && npm run dev -- -p 3014
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
├── packages/shared/
│   ├── package.json                ✅ NEW
│   ├── tsconfig.json               ✅ NEW
│   └── src/
│       ├── index.ts                ✅ NEW
│       ├── enums/index.ts          ✅
│       └── entities/               ✅ NEW — all 22 entities
│
├── services/auth/
│   ├── .env                        ✅
│   └── src/
│       ├── main.ts                 ✅ updated
│       ├── app.module.ts           ✅ updated
│       ├── enums/index.ts          ✅
│       ├── entities/               ✅ (User, Practitioner, Patient)
│       └── auth/                   ✅ FULL (service, controller, module, DTOs, guards, strategies)
│
├── services/patient/
│   ├── .env                        ✅
│   └── src/
│       ├── main.ts                 ✅
│       ├── app.module.ts           ✅
│       ├── enums/index.ts          ✅
│       ├── entities/               ✅ (Patient, AllergyIntolerance, Condition, Observation)
│       ├── common/                 ✅ (jwt-auth.guard, roles.guard, decorators)
│       └── patient/                ✅ FULL (service, controller, module, DTOs, fhir.mapper)
│
├── services/appointment/       ✅ FULL
├── services/clinical/          ✅ FULL (incl. QR code generation)
├── services/pharmacy/          ✅ FULL
├── services/lab/               ✅ FULL (incl. PDF report generation)
├── services/notification/      ✅ FULL
├── services/audit/             ✅ FULL
└── services/api-gateway/               ✅ FULL (JWT validation + path proxy)
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

---

## Phase 7: End-to-end Testing & Polish ✅ DONE

### What was done:
1. ✅ TypeScript compile errors fixed across all 5 frontends (clean `tsc --noEmit`)
2. ✅ EncounterEditor `handleFinishVisit` wired to real API: creates encounter → saves SOAP note → posts vitals (per LOINC code) → creates prescriptions → creates lab orders → marks encounter completed
3. ✅ PatientRegistrationForm and BookAppointmentForm were already wired (Phase 6)
4. ✅ Notifications polling added to all 4 staff Topbars (doctor, receptionist, pharmacy, lab) — polls `GET /notifications/count` every 30s, shows live badge
5. ✅ Type alignment across all frontends — FHIR-mapped types now consistent with what the API returns

### Key fixes:
- `mappers.ts` in all 5 frontends — removed stale fields (`registeredBy`, `checkInTime`, `visitId`, `qrCode`, `vitals`, `diagnoses`, `prescriptionIds`, `labOrderIds`)
- `EncounterEditor.tsx` — full API integration with LOINC-coded vitals, per-item prescriptions, per-test lab orders
- Pharmacy components updated to use API-returned `StockItem`/`DispenseRecord` instead of old domain types
- Lab components updated to use FHIR-mapped `LabOrder` instead of old domain types
- Patient portal pages — missing `getDoctorName` imports and `never[]` type fixes
- Data JSON import paths fixed in doctor + patient frontends (`../../../data/`)

---

## Phase 8: Production Readiness ✅ DONE

### What was done:

1. ✅ **JWT refresh token flow** — all 5 frontends' `client.ts` updated with full refresh interceptor:
   - On 401, reads `curo_refresh_token` from localStorage
   - Calls `POST /auth/refresh` to get new token pair
   - Retries the original request with new token
   - Concurrent 401s are queued and all retried after one refresh
   - Falls back to logout if refresh fails

2. ✅ **Patient portal visits page** — fully wired to real API:
   - Added `getMyEncounters(patientId)` to `patient-portal.ts`
   - Added `getPractitioners()` to `patient-portal.ts`
   - `visits/page.tsx` now fetches encounters + practitioners, shows loading state
   - GET /encounters/patient/:id now accessible by PATIENT role

3. ✅ **End-to-end smoke testing** — all 9 services verified:
   - All 6 user types can log in (admin, doctor, receptionist, pharmacist, lab, patient)
   - JWT refresh works end-to-end
   - All service endpoints return correct seeded data
   - Gateway proxy works (POST + GET via gateway)

### Key bugs found and fixed during smoke testing:

- **Empty `main.ts`** — All 7 non-auth services had empty main.ts (scaffold issue). Written for all.
- **Auth service Patient entity** — Minimal entity created incomplete patients table. Replaced with full entity.
- **`birthDate` NOT NULL** — Made nullable in patient entity to allow TypeORM ALTER TABLE.
- **PostgreSQL SCRAM-SHA-256** — Docker bridge IPs get scram-sha-256 auth by default. Fixed by setting `host all all 0.0.0.0/0 trust` in pg_hba.conf and adding `POSTGRES_HOST_AUTH_METHOD: trust` to docker-compose.yml.
- **JWT payload missing practitionerId** — Auth service JWT only had `{sub, email, role}`. Added `practitionerId` and `patientId` to payload. Updated all 7 service JWT guards to extract them.
- **Appointment filter using userId instead of practitionerId** — Fixed appointment service to filter by `practitionerId` from JWT token, not `userId`.
- **Clinical service using userId as practitionerId** — Fixed all create methods to use `practitionerId ?? userId`.
- **Gateway body-parser** — NestJS body-parser consumed POST bodies before proxy could forward them. Fixed with `bodyParser: false` on gateway app.
- **Gateway proxy created per-request** — Rewrote proxy middleware to pre-create one proxy per target service at startup (http-proxy-middleware v4 compatible).
- **Seed organizations table** — Removed organizations insert (table never created); practitioners.organizationId is nullable.

### How to run the full stack (updated):

```bash
# 1. Start Docker (postgres + redis)
docker compose up -d

# 2. Start all 9 backend services (from their directories)
cd services/auth && node dist/main.js &
cd services/patient && node dist/main.js &
cd services/appointment && node dist/main.js &
cd services/clinical && node dist/main.js &
cd services/pharmacy && node dist/main.js &
cd services/lab && node dist/main.js &
cd services/notification && node dist/main.js &
cd services/audit && node dist/main.js &
cd services/api-gateway && node dist/main.js &

# 3. Run seed (after services have started and created tables)
npm run seed

# 4. Start frontends
cd apps/doctor && npm run dev -- -p 3010
cd apps/patient && npm run dev -- -p 3011
cd apps/receptionist && npm run dev -- -p 3012
cd apps/lab && npm run dev -- -p 3013
cd apps/pharmacy && npm run dev -- -p 3014
```

### Smoke test results (all passing):

| Service | Endpoint | Result |
|---------|----------|--------|
| Auth | POST /auth/login (all 6 roles) | ✅ |
| Auth | POST /auth/refresh | ✅ |
| Auth | GET /auth/practitioners | ✅ 3 doctors |
| Patient | GET /patients (doctor) | ✅ 10 patients |
| Patient | GET /patients/me (patient) | ✅ |
| Appointment | GET /appointments (doctor filtered) | ✅ 7 appointments |
| Clinical | GET /encounters | ✅ 3 encounters |
| Clinical | GET /encounters/patient/:id (patient) | ✅ |
| Pharmacy | GET /stock | ✅ 20 items |
| Pharmacy | GET /prescriptions/pending | ✅ 3 pending |
| Pharmacy | GET /stock/alerts | ✅ 3 low stock |
| Lab | GET /orders | ✅ 8 orders |
| Lab | GET /reports | ✅ 5 reports |
| Lab | GET /instruments | ✅ 2 instruments |
| Notifications | GET /notifications | ✅ |
| Notifications | GET /notifications/count | ✅ |
| Audit | GET /audit (admin) | ✅ |
| Gateway | POST /auth/login (proxy) | ✅ |
| Gateway | GET /patients (proxy) | ✅ 10 patients |
| Gateway | GET /appointments (proxy) | ✅ 7 appointments |

---

## Phase 9: Full dockerized stack + end-to-end API verification ✅ DONE

Brought the **entire stack up in Docker** (`docker compose up -d --build`) for the
first time — all 9 backends + 5 frontends + postgres + redis + one-shot seed.

### Bugs found & fixed bringing the stack up

- **clinical-service crash-loop** — `qrcode` was only present as `@types/qrcode`
  (dev type), not as a runtime dependency, so `npm ci --omit=dev` skipped it and
  the container died with `Cannot find module 'qrcode'`. Added `qrcode@^1.5.4` to
  `curo-clinical-service` dependencies + lockfile.
- **`GET /auth/practitioners` 500** — query referenced `p.isActive`, but the
  Practitioner entity column is `active`. Fixed to `p.active`.
- **Doctor frontend ↔ clinical route mismatch** — frontend calls
  `GET /encounters?patientId=` and `GET /tasks[?status=open]`, which the backend
  did not expose (only `/encounters/patient/:id` and `/tasks/mine`). Added
  `GET /encounters` and `GET /tasks` routes (status=open ⇒ non-terminal statuses).
- **Lab frontend ↔ gateway prefix mismatch** — lab frontend called `/lab/orders`,
  `/lab/results`, etc., but the gateway maps `/orders`,`/results`,`/reports`,
  `/instruments` (no `/lab` prefix) to the lab service. Dropped the `/lab/` prefix
  in `apps/lab/src/lib/api/lab.ts`.
- Removed obsolete `version:` key from `docker-compose.yml`.

### End-to-end API verification (all through the gateway :3000)

**Reads — 28/28 pass** across auth, patient, appointment, clinical, pharmacy, lab,
notification, audit (login verified for all 6 roles; FHIR `resourceType` present in
clinical/patient/appointment/lab/pharmacy responses).

**Writes — all pass:**

| Flow | Endpoint | Result |
|------|----------|--------|
| Receptionist register patient | POST /patients | ✅ 201 FHIR Patient + CUR code |
| Receptionist book appointment | POST /appointments | ✅ 201 Appointment |
| Doctor create encounter | POST /encounters | ✅ 201 Encounter |
| Doctor SOAP note | POST /notes | ✅ 201 |
| Doctor vitals | POST /vitals | ✅ 201 Observation |
| Doctor prescription | POST /prescriptions | ✅ 201 MedicationRequest |
| Doctor lab order | POST /lab-orders | ✅ 201 ServiceRequest (+QR) |
| Doctor task | POST /tasks | ✅ 201 |
| Doctor finish visit | PUT /encounters/:id/status (completed) | ✅ 200, periodEnd set |
| Pharmacy dispense | POST /dispense | ✅ 201 MedicationDispense + receipt |
| Lab enter results | POST /results | ✅ 201 DiagnosticReport (final) |

### How to run the whole thing now

```bash
docker compose up -d --build      # builds + starts everything
docker compose ps                 # all healthy; curo-seed exits 0
# Frontends: doctor :3010  patient :3011  receptionist :3012  lab :3013  pharmacy :3014
# Gateway   :3000   (seed data already present; admin@curo.health / Admin@12345)
```

---

## Nursing Officer (triage) ✅ DONE — 2026-10-06

Pre-visit nurse triage added to the patient flow (scope narrowed from `plan/02`:
**no post-visit checklist, no Kafka** — see the note at the top of that doc).

```
reception check-in ─► nurse triage (vitals) ─► doctor visit (vitals prefilled) ─► done
        └──────── "Skip nurse" bypass ─────────┘
```

### What was built
- **NURSE role** in every `UserRole` copy (auth owns the `users`/`practitioners` Postgres enums;
  synchronize rebuilt them in place — existing users verified intact). curo-admin can create nurses.
- **Queue stages** — `appointments.queueStage` (nullable varchar): `waiting_nurse → with_nurse →
  ready_for_doctor → with_doctor → done`. Transitions + per-stage role rules in
  `services/appointment/src/appointment/queue-stage.ts` (unit-tested). `PUT /appointments/:id/queue-stage`;
  `GET /appointments?queueStage=a,b`. Status sync: `arrived` → `waiting_nurse`, `fulfilled` → `done`,
  `cancelled|noshow` → cleared. Doctors can only move their own patients.
- **Triage vitals** — `observations.appointmentId` + `performerRole` (all 4 entity copies). Nurses
  `POST /vitals` with `appointmentId`; `GET /vitals?appointmentId=`; `createEncounter` links the visit's
  triage vitals to the new encounter. patient-service: NURSE read access + FHIR `_id` filter.
- **curo-nurse** (port 3016, nested repo) — dashboard (patient-flow strip, up next, waits), triage queue
  (15 s polling, start/resume/skip/edit), triage screen (allergy/condition banner, vital tiles flagged
  against normal ranges with range gauges, BMI, last recorded values, review rail).
- **curo-doctor** — visit editor prefills triage vitals ("recorded by" banner, *edited* markers), posts only
  new/changed vitals (overrides become new doctor observations; nurse rows stay), marks the patient
  `with_doctor` on open and fulfils the appointment on sign. Queue badges on schedule/dashboard; encounter
  detail shows a "Nurse triage" marker + respiration. Fixed: signed encounters showed "Scheduled"
  (`completed` was missing from the status map).
- **curo-receptionist** — Queue Board rewired to real stages (was mock-era statuses), 15 s polling,
  "Skip nurse" bypass, schedule Check In actually checks in, Queue in the nav, dashboard stats live.
- **Seed** — idempotent `topUps()` runs on existing volumes too (nurses, medication catalog, ICD-10);
  fresh seeds also get today's patient flow across all stages.

### Verified
- `docker compose up -d` after building images **one at a time** (building all Next.js images in parallel
  exhausts the 8 GB Docker VM — `cannot allocate memory`). All containers healthy; no sync errors.
  **Use `npm run docker:rebuild`** (`scripts/docker-rebuild.sh`) instead of `docker compose up -d --build`:
  it builds every image from `docker-compose.yml` sequentially, then starts the stack.
  `npm run docker:rebuild -- curo-nurse curo-doctor` rebuilds/restarts just those; `--no-up` builds only.
- `scripts/smoke-e2e.sh` — **PASS=109, FAIL=0** (new nurse-triage section: role/JWT, check-in → nurse queue,
  `_id` lookup, 403/400 transition rules, appointment-linked vitals, encounter auto-link, fulfil → done).
- Browser walkthrough: reception check-in → nurse triage (BP 150/95 flagged) → doctor sees prefilled
  vitals + banner, overrides weight → DB shows 8 nurse rows linked to the encounter + exactly 1 doctor row;
  bypass path → doctor gets an empty panel; queue board follows every step.

### Not built (follow-ups)
- "Patient ready" notification to the doctor (the schedule badge covers it; needs either Kafka or a
  notification write from appointment-service).

## Doctor portal UI/UX rework ✅ DONE — 2026-10-06

Goal: make the doctor flow obvious — **Today queue → Start/Resume visit → Sign → back to Today**.
Frontend-only (`curo-doctor`); no backend changes.

### Flow fixes (these were real bugs, not just looks)
- **Diagnoses were never saved.** Sign now posts each one as a Condition (`category: encounter-diagnosis`,
  `encounterId`, primary marked via note) — they show on the visit summary, visit list and problem list
  (problem list de-dupes by ICD code at display time).
- **"Resume" opened a blank form / "Save draft" was a toast.** The visit now autosaves to localStorage
  (`curo_visit_draft:<userId>:<appointmentId|patient-…>`), restores on reopen, discard has undo; drafts are
  cleared on sign and on logout. Today/chart show "Draft" / "Resume visit".
- **Visits started from the chart weren't linked to the appointment** (never closed it). The editor and the
  chart now find the patient's open appointment today (`findTodaysAppointment` in `src/lib/visit.ts`).
- **Sign is retry-safe** (`signVisit` in `components/features/encounters/visit.ts` records each completed
  step; a retry never duplicates the encounter or orders). Confirm dialog lists what goes to pharmacy/lab.
- Meds and lab tests are picked from the DB catalogs (free text still allowed) → labs get real LOINC codes.
- Mapper fixes: Rx dose showed "10 null" / instructions duplicated / dates blank; lab orders had no date or
  test name; appointment dates used UTC (wrong day near midnight).
- Removed dead controls (task "Resolve" was local-only, "Pending labs" always empty, bell did nothing,
  lab "Review Results", unused "show results to patient", fake editable Settings form, UUID breadcrumbs).

### Structure
- `src/lib/visit.ts` — queue grouping + next action (`getQueueGroup`, `getVisitAction`) shared by Today,
  Schedule and the chart; draft storage helpers. `src/lib/clinical.ts` — pure record helpers.
- Shared UI: `SectionCard`, `PageHeader` (back link), `PatientAvatar`, `EmptyState`, `PageSkeleton`,
  `SearchCombobox` (ICD/med/lab pickers), `AppointmentRow`, `RxPrint`. shadcn added: avatar, dropdown-menu,
  sheet, skeleton, alert-dialog, toggle(-group). (CLI wrote `import { cn } from "cn"` — fixed by hand.)
- Chart tabs 8 → 6 (Summary absorbs Problems/Allergies), tab in `?tab=`. ⌘K patient search, real
  notifications popover, doctor's real name/specialty (looked up in `AuthContext`), mobile nav = Sheet.

### Verified
- tsc clean, `next build` OK, lint 24 → 12 problems (all pre-existing `any`s + AuthContext baseline).
- Browser walk: start from queue (triage vitals prefilled) → ICD/catalog med/custom med/2 catalog labs →
  reload restores draft → sign → back on Today; DB shows encounter completed + linked appt `fulfilled/done`,
  condition R05 primary with encounterId, 2 Rx, 2 lab orders (LOINC); lab (`/orders`) and pharmacy
  (`/prescriptions/pending`) APIs list them. Chart Start links today's appt; ⌘K, bell, task resolve,
  `?tab=labs`, 400px mobile drawer all checked. `scripts/smoke-e2e.sh` PASS=109.
- Out of scope / known: pharmacy stock is keyed by slugs (`amoxicillin-250mg`) that match neither the
  medication catalog ids nor custom codes, so dispensing won't auto-decrement for doctor-prescribed items
  (pre-existing). `/lab-orders` ignores `status`, so "Recent lab results" filters client-side.

---

## Monorepo layout + `@curo/shared` ✅ DONE — 2026-10-06

Plan + results: `plan/04-monorepo-layout-and-shared-package.md` (Doc 03 A2/A3/A4/A12).

- Layout: `apps/<role>` (portals), `services/<name>` (backends, npm workspaces
  `@curo/<name>-service`), `packages/shared` (`@curo/shared`). Compose service names unchanged.
- `@curo/shared` exports `/auth` (global `JwtAuthModule`, guards, decorators, `jwtSecret()`),
  `/database` (`databaseOptions()` + the 6 cross-service entities), `/enums`, `/fhir`,
  `/bootstrap` (`bootstrapService()`). Single-owner entities/enums stay in their service.
- One `services/Dockerfile` (context = repo root, `SERVICE` build arg) and one
  `apps/Dockerfile` (context = portal dir), each with a `<Dockerfile>.dockerignore`.
- Behaviour changes: `jwtSecret()` throws if `JWT_SECRET` is unset in production;
  fresh root lockfile moved deps to newer minors (typeorm 1.1.1, @nestjs 11.2).
- Fixed: `patients.gender` NOT NULL/nullable flip-flop between patient and auth services.
- Verified: schema dry run 0 pending for all services; schema dump identical;
  smoke PASS=109; 19 unit tests pass.
- Local dev now: `npm install` + `npm run build:shared` at the root before `start:dev`.

---

## CI + database migrations ✅ DONE — 2026-10-06

Doc 03 A2 (migrations part) and A11 (CI part). Branches: `ci/github-actions` (PR #1), `feat/db-migrations`.

- **CI** (`.github/workflows/ci.yml`): Backends job (build, unit tests, `typecheck:db`, then
  migrate → `db:check` → seed against an empty Postgres service), Portals matrix (`next build` × 7),
  gitleaks over the full history (`.gitleaks.toml` allowlists the NestJS README placeholder token).
  Node pinned by `.nvmrc` (22). Lint not gated yet (pre-existing errors).
- **Migrations**: `synchronize: false` in `databaseOptions()`. New `database/` folder:
  `data-source.ts` (CLI DataSource + `connectionOptions` reused by the seed), `migrations/`
  (`1791271595506-Baseline.ts`), `seed.ts` (moved from `scripts/`), `Dockerfile` (one image for
  `curo-migrate` and `curo-seed`, node 22). Root scripts `db:migrate|revert|generate|check`, `seed`.
- Baseline: generated from the entities on an empty DB, plus the `uuid-ossp`/`pgcrypto` extensions
  (`scripts/init.sql` deleted). It **adopts** existing DBs (`users` table present → records itself and
  does nothing, Flyway baseline-on-migrate) and its `down()` throws.
- Compose: backends depend on `curo-migrate: service_completed_successfully`; `curo-seed` depends
  only on `curo-migrate` (no longer waits for all 9 backends).
- Verified: live `db:check` clean before and after; fresh DB migrate → check → seed clean;
  `pg_dump --schema-only` live vs fresh differs only in column/enum-value order (columns added
  later by synchronize sit last); existing volume adopted (one `migrations` row), smoke PASS=109;
  negative test (unmigrated entity column) fails `db:check`.

---

## Lint baseline ✅ DONE — 2026-10-06

Branch `chore/lint-baseline`. Lint now runs in CI: errors fail the build, warnings don't.

- **Backends:** one root `eslint.config.mjs` (ESLint 10, typed) and `.prettierrc.json`
  replace 9 identical per-service copies; it now covers `packages/shared` and `database/`
  too (`database/migrations` ignored as generated). Root `npm run lint` / `lint:fix`;
  per-service lint/format scripts and lint devDeps removed.
- Formatting-only commit `6df32e7` (822 Prettier errors) is in `.git-blame-ignore-revs`.
- Backend fixes: `AuthUser.role` typed `UserRole` and services use the shared `AuthUser`
  (3 local copies removed); unused imports and dead seed enums removed; type guards instead
  of `as string[]`; `void` on the gateway's intentional fire-and-forget promises.
- `no-unsafe-*` rules were **warnings** (~320); cleared in "Backend `any` cleanup" below.
- **Portals (36 errors → 0):** `AuthContext` uses `useSyncExternalStore` over localStorage
  in all 7 portals (removes the set-state-in-effect error; cross-tab sign-out);
  `useClientPagination` hook (pharmacy, receptionist); `apiErrorMessage()` in every portal's
  API client (15 call sites); typed FHIR DocumentReference/Observation and zod form
  input/output types instead of `as any`. ~70 portal warnings remained (cleared below).
- Verified: backend build/test/typecheck, all 7 `next build`, smoke PASS=109 on rebuilt
  images. In the browser: doctor login → dashboard → reload (session restored, profile
  name enriched) → sign out; pharmacy and receptionist login from a fresh load;
  receptionist appointments pagination resets to page 1 on filter or page-size change.

---

## Backend `any` cleanup ✅ DONE — 2026-10-06

Branch `fix/backend-no-unsafe-any`. The 322 `no-unsafe-*` warnings are gone and those rules
are errors again (as is `no-floating-promises`); root `npm run lint` uses `--max-warnings 0`.

- **Shared:** `JwtPayload` + `toAuthUser()` (guard, auth service, gateway), typed `AuthRequest`
  in the guards, `CurrentUser` throws 401 when no guard ran, `actorId()` for
  practitioner-or-user, `SearchQuery`, `parsePagination(query, defaultPageSize)`,
  `ServiceRequest.testPanel: LabPanelTest[]`.
- **Controllers:** `@CurrentUser() user: AuthUser`, `@Query() query: PaginationQuery |
  SearchQuery` everywhere (interfaces, so no runtime validation change).
- **Bodies that were `any` now have DTOs** (whitelist strips unknown fields):
  `POST /audit` (userId/userRole now come from the token), `POST/PUT /tasks` (PUT could
  overwrite `ownerId`/`id`), `POST /instruments`. `GET /tasks?status=<unknown>` → 400.
- **Auth service:** dropped its copies of `Roles`/`RolesGuard`/`CurrentUser`; the passport
  `JwtAuthGuard` stays (it also rejects deactivated accounts) and returns a full `AuthUser`.
- **De-duplication:** `insertStaff()` in the seed (5 copies), `LabResultItem` (entity,
  DTO, PDF generator), notification paging via `parsePagination`, lab-order per-test QR
  creation only in `getTestQrs()`.
- **Bugs found on the way:** gateway merged service specs in response order, not
  `SERVICE_MAP` order; `queue-stage.spec.ts` didn't type-check (`tsc --noEmit` only — jest
  and `nest build` skip it). TypeORM 1.x throws on `undefined` in `where`, so optional
  filters use conditional spreads.
- `no-explicit-any` is still off: ~150 explicit `any`s remain, mostly `Promise<any>` on
  FHIR mapper return types. Typing those (FHIR resource types) is the next step.
- Verified: `npm run lint` clean, backend build/test, `tsc --noEmit` for every service
  (specs included), `typecheck:db`; fresh scratch DB migrate → `db:check` (no drift) → seed
  (all staff linked both ways) → re-seed takes the top-up path; smoke PASS=109 on rebuilt
  images. Spot checks: forged audit `userId` replaced by the caller's; task PUT ignores
  `ownerId`, bad status → 400; `/tasks?status=bogus` → 400; invalid `/instruments` → 400;
  `/organizations` without `type` → 200; `/auth/users` admin 200 / receptionist 403.

---

## Portal lint warnings ✅ DONE — 2026-10-06

Branch `fix/portal-lint-warnings`. All 7 portals lint clean; each `lint` script uses
`--max-warnings 0`.

- 52 unused imports removed; dead `lib/data/api.ts` shims deleted (pharmacy, receptionist).
- Dead code and props: `staff` placeholders, the pharmacy prescription page's never-loaded
  `prescription`/`patient` state, `DemographicsTab` `allergies` (the header shows them),
  `ReportsDashboard` `visits`, `AppointmentCard` filter props. Admin audit client no longer
  accepts a `search` that `/audit` doesn't support.
- Lab: the worklist's department filter is removed — orders carry no department, so it
  never filtered anything. The order page's `loadData` is a `useCallback` on `orderId`.
  QR `<img>`s keep `<img>` (data: URLs) with a reasoned disable.
- Follow-ups seen, not done: the pharmacy prescription page shows dispense records only
  (no `GET /prescriptions/:id`). The receptionist Visit History tab (always `visits={[]}`)
  was removed in `refactor/remove-visit-history-tab`: the Appointments tab covers it, and
  encounters stay clinical-only.
- Verified: lint + `next build` for all 7 portals; rebuilt lab portal — worklist shows only
  the priority filter, order page loads each endpoint once (no refetch loop), QR renders.
