# Curo EMR — Admin Portal + Feature Enhancements

**Started:** 2026-06-20 · **Status:** in progress

A coordinated set of additions on top of the Phase 9 stack (see `BUILD_PROGRESS.md`):
a super-admin portal, per-role patient-data minimization, receptionist income
tracking, a Personal Health Number identity scheme, and several doctor/pharmacy/lab
clinical features. Delivered as **vertical slices** — each leaves the stack bootable
via `docker compose up -d --build` (no volume wipe) with a valid seed.

## Locked decisions

- **PHN**: 12-digit numeric `YYYY`(4) + sequence(7) + **Luhn check digit**(1).
  Generate-and-retry uniqueness. Primary unique patient identifier; **NIC optional**
  (esp. minors). Column **nullable + unique index**, backfilled.
- **Currency**: configurable via `CURRENCY` env (default `LKR`, shown as `Rs.`).
- **Admin edit scope**: user accounts/roles + receptionist visit amounts + patient
  demographics. Clinical records read-only. All edits audit-logged.
- **Data minimization**: backend role-scoped patient projection + UI cleanup. Reduce
  **pharmacy** & **lab** only; doctor/patient(own)/super-admin full; receptionist broad
  (needs demographics/contact/insurance to register & bill).
- **No new backend service**: user mgmt in auth-service; income in appointment-service;
  admin activity views = cross-domain reads via gateway.

## Cross-cutting rules

- New columns **nullable + backfilled**; every slice survives `up --build` with no volume wipe.
- Receptionist income & role projection enforced **server-side** (JWT, not client params).
- Audit-log every admin + receptionist write.
- Charts: `recharts` + `shadcn add chart`, reuse `--chart-1..5` / `--status-*` tokens.
- Update `scripts/seed.ts` at the end of each slice.

---

## Progress checklist

### Phase 0 — Commit + tracker
- [x] Commit all 6 repos (rollback checkpoint) — root `51cadbc`, curo-patient `744aabf`
- [x] Create this progress tracker

### Slice 1 — PHN + minor-friendly NIC (item 4) ✅
- [x] `personalHealthNumber` column (nullable + unique) on Patient entity (shared + patient-service)
- [x] `generatePhn()` (YYYY + seq + Luhn) + generate-retry in `create()`
- [x] DTO: NIC optional, PHN optional (server-generated)
- [x] FHIR mapper: PHN primary identifier; search includes PHN + NIC
- [x] Backfill existing patients (`OnModuleInit` in PatientService)
- [x] Frontend: registration form NIC optional + PHN in success toast; PHN shown in receptionist/doctor headers, demographics, patient profile, lists
- [x] Seed PHNs (+ a minor patient with no NIC)
- All touched projects typecheck clean (`tsc --noEmit`)

### Slice 2 — Per-role patient-data minimization (item 2) ✅
- [x] `toFhirPatient(patient, role)` projection — PHARMACIST/LAB_STAFF get only PHN, MRN, name, gender, birthDate
- [x] Controller passes `req.user.role` (findAll/findOne/findByCode); pharmacy+lab granted detail access with reduced shape
- [x] Pharmacy keeps allergies (dispensing safety); curo-pharmacy UI: removed NIC/bloodType/phone/email
- [x] curo-lab UI: removed bloodType/phone/email; shows PHN for specimen labeling
- Receptionist/doctor/patient(own)/super-admin unchanged (full). All typecheck clean.

### Slice 3 — Receptionist income (item 3) ✅
- [x] Payment + AuditLog entities → appointment-service; payments module
- [x] `POST /payments` (immutable, one per appointment, collectedBy from JWT), `GET /payments/mine`, `GET /payments/summary` (day/week/month buckets)
- [x] Admin-only `PUT /payments/:id` (audit-logged before/after)
- [x] Gateway route `/payments`; `CURRENCY` env (default LKR)
- [x] Receptionist: Income dashboard (recharts bar chart + totals + period filter); per-visit RecordPaymentCell on appointments (locks after submit)
- [x] Seed payments (past visits)
- **Verified live:** PHN backfill, pharmacist projection (no NIC/bloodType), income isolation, receptionist PUT→403, admin PUT→200 + audit

### Slice 4 — curo-admin portal (item 1) ✅
- [x] Auth-service AdminModule: `POST/GET /auth/users`, `GET /auth/users/:id`, `PATCH /auth/users/:id`, `POST /auth/users/:id/reset-password` (SUPER_ADMIN, audited; mounted under /auth so no gateway change)
- [x] New `curo-admin/` frontend (port 3015): SUPER_ADMIN-gated; Users list/search/create/detail (suspend/activate/reset); per-receptionist income oversight with admin amount correction; Audit log; Dashboard (recharts)
- [x] Docker service (3015) + gateway `FRONTEND_ORIGINS`/default origins
- **Verified live:** admin create doctor (logs in), suspend (login 401), reset, receptionist 403; curo-admin builds + serves /login (200)

### Slice 5 — Doctor e-prescription print + vitals charts (items 5, 8) ✅
- [x] Prescription print: per-item checkboxes (full/partial) → `window.print()` with print-only e-prescription layout + `@media print` stylesheet
- [x] Multi-code category-agnostic trend endpoint `GET /vitals/patient/:id/trends?codes=` (clinical-service)
- [x] Seed glucose/cholesterol trend observations w/ reference ranges (+ live-inserted for 2 patients); BP from existing vitals
- [x] Recharts Trends tab: BP/sugar/cholesterol line charts, normal-range band, out-of-range points flagged red + latest-value badges
- **Verified live:** trends endpoint returns multi-code series; doctor build passes. (Also fixed a multi-service `synchronize` hazard — added PHN column to auth-service Patient entity so it stops dropping the column.)

### Slice 6 — Pharmacy multi-batch stock + dispense (item 7) ✅
- [x] `GET /stock/grouped` — group by drug, batches sorted FEFO; total qty
- [x] `dispense()` FEFO-decrements across batches (best-effort, skips expired) + records `batchNumber` on MedicationDispense
- [x] Pharmacy UI: grouped inventory, expandable batch list, expired/near-expiry highlight
- [x] Seed multi-batch drugs (future-dated `-B` batches) + live data
- **Verified live:** dispense drew 10 from earliest-expiring batch B (400→390), batch A untouched; record shows batch

### Slice 7 — Lab per-test QR (item 9) ✅
- [x] QrCode `testCode`/`testIndex` columns (clinical + lab + shared, synced to avoid synchronize drops)
- [x] createLabOrder generates a QR per test; `getTestQrs` lazily backfills; clinical OnModuleInit backfills existing orders
- [x] `GET /lab-orders/:id` and lab `GET /orders/:id` return `tests:[{testCode,display,qrBase64}]`
- [x] `POST /orders/scan` parses per-test URL (`?test=&i=`) → resolves order + specific test (returns scannedTest)
- [x] Lab UI: printable per-test sample labels (QR + patient + order) with `@media print`
- **Verified live:** 15 per-test QR rows; scan of a test URL resolved order + Hemoglobin; lab getOrder returns qr per test

### Slice 8 — Doctor pharmacy/lab inventory lookup (item 6) — last, time-boxed
- [ ] Organization dimension (seed pharmacies/labs)
- [ ] nullable `organizationId` on Stock + backfill default pharmacy
- [ ] Lab catalog → lab-service (seeded per-lab)
- [ ] Read-only org/inventory/catalog endpoints + gateway route
- [ ] Doctor pharmacy/lab selectors

---

## Verification (run after each slice / at the end)

`docker compose up -d --build` (no volume wipe) → `docker compose ps` healthy, `curo-seed` exits 0.
Then exercise: PHN on minor, role-minimized payloads, receptionist income lock/own/chart,
admin user CRUD + activity views, doctor print + flagged charts, pharmacy FEFO dispense,
lab per-test QR + scan.
