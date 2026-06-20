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

### Slice 4 — curo-admin portal (item 1)
- [ ] Auth-service admin user endpoints (create/list/search/edit/reset, SUPER_ADMIN, audited)
- [ ] New `curo-admin/` frontend (port 3015): users, income oversight, demographics edit, audit, dashboard
- [ ] Docker service + gateway `FRONTEND_ORIGINS`

### Slice 5 — Doctor e-prescription print + vitals charts (items 5, 8)
- [ ] Prescription print (full/partial) via print stylesheet
- [ ] Multi-code category-agnostic trend endpoint
- [ ] Seed reference ranges (BP/glucose/cholesterol)
- [ ] Recharts charts with high/low flagging

### Slice 6 — Pharmacy multi-batch stock + dispense (item 7)
- [ ] `GET /stock/grouped` (FEFO batches)
- [ ] `dispense()` decrements stock FEFO + records batch
- [ ] UI grouped batches + expiry highlight
- [ ] Seed multi-batch drugs

### Slice 7 — Lab per-test QR (item 9)
- [ ] QrCode per-test (testCode/testIndex)
- [ ] createLabOrder loops tests; GET returns per-test QR
- [ ] Fix `POST /orders/scan` (test → order)
- [ ] Lab UI printable per-test labels

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
