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

### Slice 1 — PHN + minor-friendly NIC (item 4)
- [ ] `personalHealthNumber` column (nullable + unique) on Patient entity (shared + patient-service)
- [ ] `generatePhn()` (YYYY + seq + Luhn) + generate-retry in `create()`
- [ ] DTO: NIC optional, PHN optional (server-generated)
- [ ] FHIR mapper: PHN primary identifier; search includes PHN
- [ ] Backfill existing patients
- [ ] Frontend: registration forms (NIC optional), PHN display
- [ ] Seed PHNs

### Slice 2 — Per-role patient-data minimization (item 2)
- [ ] `toFhirPatient(patient, role)` projection (reduce PHARMACIST + LAB_STAFF)
- [ ] Controller passes `req.user.role`
- [ ] curo-pharmacy UI cleanup
- [ ] curo-lab UI cleanup

### Slice 3 — Receptionist income (item 3)
- [ ] Payment entity → appointment-service; payments module
- [ ] `POST /payments` (immutable), `GET /payments/mine`, `GET /payments/summary`
- [ ] Admin-only `PUT /payments/:id`
- [ ] Gateway route `/payments`
- [ ] Receptionist income entry (locked) + dashboard chart (day/week/month)
- [ ] Seed payments

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
