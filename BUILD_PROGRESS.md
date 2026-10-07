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
- [x] POST /results → enters results per test panel, and notifies the ordering doctor
- [x] PDF report generation via pdfkit (lab report with patient info, results, flags, ref ranges)
- [x] DiagnosticReport FHIR response
- [x] GET /reports, GET /reports/:id
- [x] GET/POST /instruments, PUT /instruments/:id/status
- [x] GET /orders/tat (turnaround time stats)
- Entities: ServiceRequest, DiagnosticReport, Observation, QrCode, LabInstrument

### curo-notification-service (port 3007) ✅
- No create route: the services raise notifications themselves (`notifyPractitioner` in `@curo/shared/notifications`)
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
- [x] JWT validation at gateway (rejects missing/invalid tokens; forwards the request unchanged)
- [x] Path-based proxy routing to all 8 upstream services
- [x] Public paths bypassed: /auth/login, /auth/register, /auth/refresh; `GET /health` answered by the gateway itself
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
- `no-explicit-any` was still off here; turned on in `refactor/type-explicit-anys` (below).
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
- Follow-ups: the pharmacy prescription page got its detail view in
  `feat/pharmacy-prescription-detail` (below). The receptionist Visit History tab (always
  `visits={[]}`) was removed in `refactor/remove-visit-history-tab`: the Appointments tab
  covers it, and encounters stay clinical-only.
- Verified: lint + `next build` for all 7 portals; rebuilt lab portal — worklist shows only
  the priority filter, order page loads each endpoint once (no refetch loop), QR renders.

---

## Pharmacy prescription detail ✅ DONE — 2026-10-06

Branch `feat/pharmacy-prescription-detail`. The prescription page now shows what is being
dispensed, and the Dispense button works.

- **Bug:** the portal posted `{ prescriptionId }` to `POST /dispense`, which requires
  `medicationRequestId`/`dispenserName`, so every click was a 400. Fixed; `dispenserName` is
  the user's name, falling back to the email (login returns no name for staff).
- **Clinical:** `GET /prescriptions/:id` (DOCTOR, PHARMACIST, SUPER_ADMIN; 404 if missing),
  declared after the literal `prescriptions/*` routes.
- **Pharmacy service:** dispensing a prescription that isn't `active` → 409 (it used to
  decrement stock and issue a second receipt). The dispense's `patientId` comes from the
  prescription, not the body (dropped from the DTO). `GET /dispense?prescriptionId=` filters
  on the server; the portal used to filter the latest 100 records client-side.
- **Portal:** the page shows the patient (with allergies), the medication (directions,
  frequency, route, quantity, duration, note), status and prescribed date; Dispense only for
  active prescriptions. Shared `PatientSummaryCard` and `DispenseRecordCard` (also used by the
  patient page).
- **Mapper fixes:** `completed` mapped to `sent_to_pharmacy` (dispensed prescriptions looked
  pending) and `cancelled`/`stopped` to `draft`; `durationDays` read an extension the server
  never sends (always 7); `dose` showed the total quantity; `createdAt` read `meta.lastUpdated`
  (never set) instead of `authoredOn`. The pharmacy patient page's allergy banner never showed
  (`mapFhirPatient` returns `allergies: []`); it now loads `/patients/:id/allergies`.
- Not done here: the portal sent no `unitPrice`, so every dispense totalled 0 — priced on the
  server in `fix/pharmacy-dispense-integrity` (below).
- Verified: root lint, `tsc --noEmit` (clinical, pharmacy), pharmacy portal lint + `next
  build`; smoke PASS=114 on rebuilt images (new: Rx by id 200 / receptionist 403, dispense
  patient from prescription, second dispense 409, history by prescription = 1). In the
  browser: pending Rx shows patient + allergies + medication → Dispense → Completed with the
  receipt; patient with an allergy shows the banner.

---

## Dispense integrity, staff names, patient-list allergies ✅ DONE — 2026-10-06

Branch `fix/pharmacy-dispense-integrity`. Follow-ups from the prescription detail work.

- **Concurrent dispenses:** two simultaneous `POST /dispense` for one prescription both got
  201 — two receipts, and stock decremented once (lost update). Now one transaction: claim
  the prescription with a conditional update (`active` → `completed`; 0 rows → 409, rolled
  back), then draw FEFO batches under `pessimistic_write` row locks, then save the dispense.
- **Price:** computed on the server from the batches drawn (Σ quantity × batch `unitPrice`;
  `unitPrice` on the record is the average). `unitPrice` and `dispenserName` left the DTO.
  Units no batch can supply were still dispensed, unpriced — now refused, in
  `fix/pharmacy-rx-summary-short-stock` (below).
- **Staff names:** access/refresh tokens and the login response carry `name` (the linked
  practitioner's full name, `null` otherwise); `AuthUser.name` comes from the token. The
  dispense records it (falls back to the email for older tokens), and every portal's sidebar
  shows it after the next login. The doctor portal's profile lookup now keys on `firstName`
  (it still adds first name and specialty).
- **Patient list allergies:** the pharmacy list showed "None known" for everyone
  (`mapFhirPatient` returned `allergies: []`). New `GET /patients/allergies?patientIds=`
  (≤100 UUIDs, validated; staff roles, not PATIENT) — one request per page; a failed lookup
  shows "Unavailable". The always-empty `allergies`/`problemList`/`currentMedications` are
  gone from the pharmacy `Patient` type. Shared `formatAllergies()`.
- Not done here: the list's Last Prescription / Total Rx columns counted pending prescriptions
  only (the page loaded `/prescriptions/pending`) — fixed in
  `fix/pharmacy-rx-summary-short-stock` (below). Portals keep a session stored before this change
  (no name) until the next login.
- Verified: root build, lint, tests, `typecheck:db`, `db:check` (no drift), `tsc --noEmit` for
  every service; pharmacy + doctor portal lint and typecheck; smoke PASS=122 on rebuilt images
  (new: batch allergies 200/400/403, priced dispense = 25, dispenser name, concurrent
  dispenses → one 201 + one 409, stock drawn once). Race repro before/after: 201+201 →
  201+409. In the browser: patient list shows real allergies; receipt "Dispensed by Kasun
  Bandara", Rs. 55.00; pharmacy sidebar shows the name; doctor greeting and specialty intact.

---

## `no-explicit-any` on ✅ DONE — 2026-10-06

Branch `refactor/type-explicit-anys`. The backend rule is back to `error` (from
`recommendedTypeChecked`); the portals already had it on.

- 55 explicit `any`s remained (earlier cleanups took the rest of the ~150). 54 were
  `Promise<any>` / `Promise<any[]>` annotations on service methods returning a mapper's
  output — removed, so the type is inferred from the mapper (one source of truth). No type
  errors surfaced; emitted declarations contain no `any`.
- `CreateVitalsDto.components` is `Record<string, unknown>[]` (the entity's type), validated
  with `@IsArray()` + `@IsObject({ each: true })` — a malformed body is now a 400.
- Portals: the calendar's `[key: string]: any` (admin, doctor, receptionist) only let
  callers attach an `appointment` the calendar never read; both removed.
- Verified: root lint/build/tests/`typecheck:db`, `tsc --noEmit` for every service; admin,
  doctor and receptionist portal lint + typecheck + `next build`; smoke PASS=123 on rebuilt
  images (new: vitals with non-object `components` → 400).

---

## Patient-list Rx summary, no short-stock dispense ✅ DONE — 2026-10-06

Branch `fix/pharmacy-rx-summary-short-stock`. Follow-ups from dispense integrity.

- **Rx columns:** the pharmacy patient list counted every pending prescription in the system
  on the client, and showed nothing about prescriptions already dispensed. New
  `GET /prescriptions/summary?patientIds=` (clinical; DOCTOR, PHARMACIST, SUPER_ADMIN): one
  grouped query returns each patient's pending count and latest `authoredOn`. The list fetches
  it per page alongside allergies; columns are now **Pending Rx** and **Last Prescribed**, and a
  failed lookup shows "Unavailable", not 0. The patients page no longer loads pending
  prescriptions.
- **Short stock:** a dispense that non-expired stock can't cover is refused with 409 ("Not
  enough X in stock: N available, M needed. Receive stock before dispensing."), shown on the
  prescription page. The transaction rolls back, so the prescription stays active and no batch
  is drawn. Every dispense is now fully priced, and its `unitPrice` is `totalPrice / quantity`.
- **Shared DTO:** `PatientIdsQueryDto` (≤100 UUIDs, comma-separated) moved to
  `@curo/shared/dto`; the allergies and prescription-summary endpoints both use it.
  `class-validator`/`class-transformer` are optional peer deps of the shared package.
- Note: `/prescriptions/*` routes to clinical at the gateway, so pharmacy's own
  `GET /prescriptions/pending` was unreachable — removed in `refactor/remove-dead-pending-route`
  (below).
- Verified: root build, lint, tests, `tsc --noEmit` (clinical, patient, pharmacy), pharmacy portal lint and
  typecheck; smoke PASS=130 on rebuilt images (new: summary pending count, 400/403;
  Metformin stocked before its dispense; short-stock 409 with its message, stock and
  prescription unchanged). In the browser: patient list shows Pending Rx / Last Prescribed;
  dispensing an 81-tablet prescription against 80 in stock shows the message and the
  prescription stays "Sent to Pharmacy".

---

## Dead pharmacy pending-prescriptions route removed ✅ DONE — 2026-10-06

Branch `refactor/remove-dead-pending-route`. The gateway sends every `/prescriptions*` request
to clinical, so pharmacy-service's own paginated `GET /prescriptions/pending` (and its
"pharmacist sees less" projection) never served a request.

- Removed the pharmacy route and service method. Clinical's handler is the only one, and the
  pharmacy portal's queue, dashboard and reports keep using it unchanged.
- Portal: removed the unused `getPendingPrescriptionsPaginated`; `getPendingPrescriptions` no
  longer sends a `pageSize` clinical ignored and reads the plain array clinical returns.
- Gateway OpenAPI-merge comment and `docs/API_VERIFICATION.md` (finding 2) updated.
- Verified: root lint, build, tests; pharmacy portal lint and typecheck; smoke PASS=130 on
  rebuilt images; pharmacy-service `:3005/prescriptions/pending` → 404 (was 401). In the
  browser: the prescriptions queue lists pending prescriptions as before.

---

## Security hardening: ports, health, gateway headers, secrets ✅ DONE — 2026-10-07

Branch `fix/security-hardening` (plan/03 A5, A6, A7). The fourth part of this batch, the
`GET /prescriptions/pending` clash, was already fixed in `refactor/remove-dead-pending-route`.

- **Ports (A5):** only the gateway (3000) and portals (3010–3016) publish host ports. The 9
  backends are reachable only through the gateway. Postgres (5432) and MinIO's S3 API (9000)
  bind to 127.0.0.1 for running code from source; Redis and the MinIO console publish nothing.
  Documents are streamed through the document service (presigned URLs are unused), so the
  browser never needs MinIO.
- **Health (A6):** `registerHealthCheck()` (`@curo/shared/health`) serves
  `GET /health` → `{"status":"ok"}` from the HTTP adapter, ahead of every middleware and guard.
  `bootstrapService` registers it for every backend; the gateway's `main.ts` does the same, so
  `/health` left the gateway's public-path list (where it 404'd). `GET /auth/health` is gone.
  Compose has one health check, `wget` against `$PORT/health`, in place of ten `nc` port pokes.
- **Gateway headers (A6):** `x-user-id/role/email` are no longer injected (nothing read them,
  and a client could send its own). The gateway still rejects a missing or invalid token,
  then forwards the request unchanged.
- **Secrets (A7):** compose reads `DB_PASS`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
  `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` from a git-ignored `.env`
  (`cp .env.example .env`). Each is declared once under `x-secrets` with `${VAR:?…}`, so compose
  refuses to start without it. `.env.example` was rewritten (it had `DB_PASSWORD`, which nothing
  reads). `POSTGRES_HOST_AUTH_METHOD: trust` is removed.
- **Production fallbacks:** `secretFromEnv()` (`@curo/shared/config`) throws under
  `NODE_ENV=production` instead of using the dev default. It covers `JWT_SECRET` (as before),
  plus `JWT_REFRESH_SECRET`, which silently fell back to a public value and made refresh tokens
  forgeable, and `DB_PASS` and `MINIO_SECRET_KEY`. The auth service reads the refresh secret at
  startup, so a missing value stops the boot.
- **Existing dev volumes:** Postgres writes `pg_hba.conf` only when the volume is first
  created, so a volume from before this change still has `trust`. Run
  `docker compose down -v` (this deletes the data) to get password auth.
- Tests: new `services/api-gateway/src/gateway.spec.ts` checks that `/health` needs no token
  and that proxied paths without a valid token get 401. It stubs `http-proxy-middleware`, which
  is ESM-only.
- Verified: root build, lint, tests, `typecheck:db`. `docker compose config` errors without
  `.env` and renders with it. Rebuilt backends are all `(healthy)` via HTTP. Host
  `:3001`–`:3009`, `:6379` and `:9001` refuse connections. `GET :3000/health` → 200. The
  merged `/openapi.json` has paths from all 9 services (78 total), fetched over the compose network. Smoke PASS=130, FAIL=0 (`/health` now 200
  plus a body check). The auth image, started with `JWT_SECRET` but no
  `JWT_REFRESH_SECRET`, exits with "JWT_REFRESH_SECRET must be set when NODE_ENV=production".

## Sign a visit in one transaction ✅ DONE — 2026-10-07

Branch `feat/save-visit-atomic` (plan/03 A10).

- **Endpoint:** `POST /encounters/visit` (clinical service, DOCTOR/SUPER_ADMIN) saves a signed
  visit in one transaction: the encounter, created `completed` with `periodEnd`, plus its note,
  vitals, diagnoses, prescriptions and lab orders (each with its QR label). It also links the
  appointment's triage vitals. A failure at any step rolls back the whole visit. Before this, the
  doctor portal made 5–15 calls, and a failure left a half-saved visit whose orders the pharmacy
  and lab could already see.
- **Idempotent:** the client sends the encounter id (`crypto.randomUUID()`, kept in the visit
  draft from the start). If that id already exists for the same patient, the endpoint returns it
  and writes nothing. If it exists for another patient, the endpoint returns 409. A concurrent
  double submit fails on the primary key and rolls back. This replaces the portal's
  `SignProgress` bookkeeping.
- **Not in the transaction:** closing the appointment (queue → done) is still a separate,
  best-effort call after the sign. It belongs to the appointment service and its queue rules, and
  the portal warns if it fails.
- **DTO:** `CompleteVisitDto` reuses the single-record DTOs through `OmitType` (dropping
  `patientId`/`encounterId`), with `@ValidateNested` + `@Type`. A diagnosis is
  `{ code, display, isPrimary }`. The server adds category `encounter-diagnosis` and the
  `Primary diagnosis` note, which the doctor portal reads back.
- **Shared kernel:** `Condition` and `ConditionClinicalStatus` moved to `@curo/shared`, because
  conditions is now mapped by the patient and clinical services. The schema is unchanged
  (`db:check` finds no drift).
- **Clinical refactor:**
  - `clinical-records.ts` holds each record's defaults (`newEncounter`, `newVital`,
    `newPrescription`, `newDiagnosis`) and the writing helpers that take the caller's
    `EntityManager` (`linkTriageVitals`, `saveLabOrder`). The single-record endpoints and the
    visit share them.
  - `createEncounter` and `createLabOrder` now run in a transaction too.
  - The FHIR mappers moved to `fhir.mapper.ts`.
- **Doctor portal:** `signVisit` makes one `completeVisit` call, then closes the appointment. The
  write helpers only the old sign used (`createEncounter`, `updateEncounterStatus`, `createNote`,
  `createVitals`, `createPrescription`, `createLabOrder`, `createCondition`) are removed. The
  backend's single-record endpoints stay; the nurse portal and the smoke script use them.
- **Known edge cases:**
  - A draft left half-signed by the old code gets a new id and saves a new, complete encounter.
    The old in-progress encounter stays behind.
  - If a sign commits but its response is lost, edits made before signing again are not applied.
    The retry returns the saved visit.
- **Tests:** `visit.service.spec.ts` (6 cases) runs `VisitService`
  against an in-memory `EntityManager`. It covers the completed encounter under the client id,
  every record linked to it, the primary diagnosis, the triage-vitals link, a replay writing
  nothing, and 409 for another patient's id.
- **Verified:**
  - Root build, lint, tests, `typecheck:db` and `db:check` pass.
  - Smoke: PASS=146, FAIL=0. The new section 8c covers the signed visit, every record counted
    once before and after a replay, the triage-vitals link, 400 for a bad id or item, and 403 for
    a pharmacist.
  - Rollback by hand: a visit whose prescription has `quantityValue: 1.5` (an integer column)
    returns 500. Afterwards there is no encounter, note, condition or prescription for its id.
  - In the browser (doctor portal on :3010), signing a visit for a checked-in appointment made one
    `POST /encounters/visit` (201) and the appointment `PUT` (200). The summary showed the note,
    the vital, the primary diagnosis, the Rx and the lab order. The pharmacy pending list and the
    lab's active queue both had the orders.

## Tests for the critical paths ✅ DONE (first pass) — 2026-10-07

Branch `test/critical-paths` (plan/03 A11).

- **Harness:** `packages/testing` (`@curo/testing`, a dev-only workspace, source only) is a Jest
  preset for each service's `test/*.e2e-spec.ts`:
  - `globalSetup` drops and recreates `curo_test` (`TEST_DB_NAME`), then runs
    `npm run db:migrate` on it, the same path deploys use.
  - A setup file sets `DB_NAME` before the `AppModule` is imported, since its decorators read
    it. Both it and `startService()` refuse any database whose name doesn't end in `_test`.
  - `startService(AppModule)` boots the module with production's request handling
    (`configureApp()`, now shared with `bootstrapService`). It listens on an ephemeral
    127.0.0.1 port, so supertest can send concurrent requests. It returns `api` (supertest),
    `db` (the service's DataSource, for fixtures and checks) and `as(role, claims?)`, which
    signs a token with fresh ids.
  - Spec files run one at a time (`maxWorkers: 1`). Each test makes its own rows and checks
    only those, so nothing is truncated.
  - `npm run test:e2e` runs every service's API tests (~20 s); CI runs it after `npm test`.
- **API tests (37):**
  - pharmacy `POST /dispense`: FEFO across batches (expired skipped, undated last), pricing from
    the batches used, a short-stock 409 that changes nothing, two simultaneous dispenses of one
    Rx dispensing once, the role guard.
  - clinical `POST /encounters/visit`: every record lands on the encounter with its lab QR
    label, triage vitals are pulled in, a replay writes nothing more, a failure mid-save leaves
    nothing (the QR encoder is made to throw), and 409 for another patient's id. Malformed
    visits and other roles write nothing.
  - patient: registration (patient code plus a check-digit-valid PHN for the current year),
    keeping a supplied PHN, 400/403 writing nothing, allergies.
  - appointment: booking, check-in into the nurse queue, the full queue path, illegal moves,
    the wrong role or another doctor's patient (403), cancelling.
  - lab: per-test label scans, a rescan keeping the first receipt time, results with a PDF
    report completing the order, unknown orders.
  - auth: sign-in, the same 401 for a wrong password and an unknown email, deactivated
    accounts, refresh (an access token is refused), staff onboarding. The auth service's own
    guard checks the account behind every token, so its tests sign in as real `users` rows.
- **Pure logic pulled out and unit-tested:**
  - `patient/phn.ts` (Luhn check digit and PHN layout), checked against standard Luhn vectors.
  - `pharmacy/fefo.ts`: which batches are usable, FEFO order, the draw plan. `drawStockFEFO`
    now locks the drug's batches in id order and plans with it. `getGroupedStock` uses the same
    comparator.
  - `lab/lab-qr.ts`: which order and test a scanned label points at.
  - Queue moves were already covered (`queue-stage.spec.ts`).
- **Removed:** the Nest starter `AppController`/`AppService`/specs (never registered) and the
  "Hello World" e2e files. Services with no unit tests run `jest --passWithNoTests`.
- **Mutation-checked:** each of these breaks a test: dropping the FEFO sort, dropping the
  prescription claim (the concurrency test), and running the visit without a transaction.
- **Verified:** root build, lint, `npm test`, `npm run test:e2e`. The pharmacy, lab and
  patient images rebuild with the new workspace in the lockfile. Smoke PASS=146, FAIL=0.
- **Not covered yet:** document (needs MinIO), notification, audit, the gateway proxying itself,
  and the FHIR mappers. All but the proxying are covered by the follow-ups below.
- **Found while writing these** (all but the first fixed in `fix/critical-path-followups`, below):
  - `POST /auth/register` is public at the gateway and takes any `role`, so anyone can create a
    SUPER_ADMIN account. No portal calls it.
  - `POST /results` (lab) saves observations, then the report, then completes the order without
    a transaction. A failure partway leaves partial results, like the old visit sign.
  - `EnterResultsDto.results` has no `@ValidateNested`, so result items aren't validated.
  - Lab scans and results and patient allergies record `user.userId` as the performer or
    practitioner, where clinical uses `actorId()` (practitionerId for staff).
  - `database/seed.ts` still has its own copy of the PHN generator. The seed image is built
    without the workspaces, so it can't import `phn.ts` yet.

## Critical-path follow-ups ✅ DONE — 2026-10-07

Branch `fix/critical-path-followups`, stacked on `test/critical-paths` (PR #14).

- **Lab results (`POST /results`):**
  - The PDF is rendered first. Then one transaction claims the order (active → completed),
    saves the observations and the report.
  - Results are saved whole or not at all. A double submit, or results for an
    already-reported or revoked order, get 409.
  - Items are validated (`@ValidateNested`, numeric `value`, at least one item).
  - The PDF names the staff member instead of an id.
  - API tests cover a real mid-save database failure (`numeric(10,2)` overflow), two
    simultaneous submits, re-entry and malformed items. Mutation-checked: removing the claim or
    the transaction fails them.
- **Practitioner, not account:** lab scans, receipts and results, and chart allergies and
  conditions now record `actorId()`, like the clinical service and the seed. Rows written
  before keep their account ids; there is no backfill, since no deployed data exists.
- **Patient identifiers:** the PHN (Luhn) and patient-code generators live in
  `@curo/shared/identifiers` and replace the copies in `PatientService` and `database/seed.ts`.
  - The seed imports the folder's source by relative path, and the database image copies just
    that folder. Keep it free of outside imports.
  - `@curo/shared` has a Jest setup now and builds from `tsconfig.build.json`, which leaves specs
    out of dist.
  - The rebuilt seed image migrated and seeded a fresh database (11 valid PHNs).
- **Document:** `startService(AppModule, overrides)` swaps a provider; the document tests use an
  in-memory `StorageProvider`. They cover the upload rules (file types, roles, author,
  CREATE audit), owner-only download for patients (READ audit, 403 without one for another
  patient), staff access, and `/documents/me`.
- **Notification:**
  - `POST /notifications` takes a validated `CreateNotificationDto`. The inline body type had
    meant nothing was validated, even `isRead`.
  - `GET /notifications/count` returns `{ count }`. It returned a bare number as `text/html`, and
    all seven portals read `res.data.count`, so the unread badge always showed 0.
  - API tests show users see, count and mark only their own notifications.
- **Audit:** API tests check that the token, not the body, says who did it, that only the super
  admin reads the log, and the filters and newest-first order.
- **Gateway:** `proxy/routes.ts` holds the route table (`targetFor`, `SERVICE_TARGETS`,
  `isPublicPath`), unit-tested for every service's routes and whole-segment matching. The
  proxying itself stays covered by the smoke script (`http-proxy-middleware` is ESM-only).
- **FHIR mappers:**
  - The patient mapper's minimized record for pharmacists and lab staff is pinned to its exact
    fields. An API test reads a patient as each of those roles through every route they can use.
  - The clinical mapper tests pin the triage-vitals extensions the doctor portal reads.
- **Type-check:** every workspace has `typecheck` (`tsc --noEmit`, tests included). The root
  `npm run typecheck` runs them and `typecheck:db`, and CI runs it in place of `typecheck:db`.
- **Verified:**
  - Root lint, build, `npm test` (82), `npm run test:e2e` (63 across 9 services),
    `npm run typecheck`, `db:check`.
  - All backend images and the migrate/seed image rebuilt. Smoke PASS=146, FAIL=0.
  - Live `GET /notifications/count` returns `{"count":1}` after a new notification.
- **Still open:**
  - `POST /auth/register` is public and accepts any role (decision pending).
  - ~~Who may `POST /notifications`~~: no one; see System notifications below.
  - The lab portal's result-entry form is a demo stub: Save and Submit only show a toast and
    never call `POST /results`.
  - The patient's name in the lab PDF is still a placeholder (`Patient <id>`).
  - Observation and ServiceRequest each have two FHIR mappers (patient/clinical, clinical/lab).

## System notifications ✅ DONE — 2026-10-07

Branch `feat/system-notifications`. Notifications are raised by the services when something
happens. No user can create one, so an inbox entry is proof that the system sent it.

- **No create route:** `POST /notifications` and its DTO are gone (404 for every role). The
  notification service only lists, counts and marks a user's own inbox. The gateway needs no
  change.
- **Raised in the same transaction:** `Notification` and `NotificationEventType` moved to the
  shared kernel (no schema change; `db:check` is clean). A service calls
  `notifyPractitioner(em, practitionerId, notice)` with its transaction's `EntityManager`.
  - It maps the practitioner to their account through `practitioners.userId`.
  - It saves nothing when they have no account.
  - Like audit logs, the row is written directly: no HTTP hop between services, no service
    token. The notification commits or rolls back with the event it reports.
- **First event, lab results ready:** `POST /results` notifies the doctor who ordered the
  tests: "<test> results for <patient name> (<code>) are ready to review", linked to the
  `DiagnosticReport`.
- **Verified:**
  - Lab API tests: the doctor's account is notified, and no row is saved when the orderer has
    no account. A failed save leaves no notification, and a double submit leaves exactly one.
    Mutation-checked: notifying the wrong id fails them.
  - Notification API tests seed the inbox directly and pin the 404.
  - Smoke PASS=147, FAIL=0: it expects 404 on POST and finds the doctor's notification from the
    lab results it entered.
- **Next events** reuse the helper. Prescription ready, appointment confirmed and low stock
  need a patient or role recipient, so add a sibling helper when the first one is built.
