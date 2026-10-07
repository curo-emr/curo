# Doc 03 — Architecture & Style Improvements (Review Findings)

**Status: reference only.** These are issues and improvement opportunities found
while reviewing the codebase on 2026-07-03. They are **not** part of Docs 01/02
and must not be implemented without the user's go-ahead — except where a Doc 02
slice explicitly fixes one (marked ✅). Ordered by impact within each section.

---

## A. Architecture / backend

### A1. Receptionist queue is still running on mock-era data model ✅ *(fixed by Doc 02 N5)*
`apps/receptionist/.../QueueBoard.tsx` filters on statuses (`waiting`,
`in_progress`, `completed`) that the backend doesn't have, and reads
`apt.visitId` / `apt.checkInTime` / `doctor.roomNumber` — fields the API never
returns (removed from mappers in Phase 7). The status map in
`appointment-actions.ts` is lossy (`in_progress → arrived`,
`completed → fulfilled`), so "Send to Doctor" is a silent no-op state-wise.
Doc 02's `queueStage` rewires this board to real state.

### A2. TypeORM `synchronize: true` + drifting entity copies is the biggest standing risk ✅ *(drift fixed by Doc 04, migrations 2026-10-06)*
> Doc 04: every table now has exactly one entity definition (cross-service ones in
> `@curo/shared/database`), so copies can no longer drift. Option 3 below is done:
> `synchronize: false` everywhere, TypeORM migrations in `database/migrations` run by
> the one-shot `curo-migrate` container, and CI's `npm run db:check` fails when an
> entity changes without a migration.
Nine services share one DB, each with hand-copied entity files, and every boot
lets any service ALTER shared tables. Stale copies have already **dropped
columns** twice (PHN, slice 5; QR test columns, slice 7). Recommended path:
1. Short term: a CI-able script that diffs each service's `src/entities/*` against
   `packages/shared/src/entities/*` and fails on drift.
2. Medium term: turn `synchronize` off everywhere except a single designated
   "schema owner" per table; or
3. Proper fix: TypeORM migrations run by a dedicated one-shot migration
   container (like `curo-seed`), `synchronize: false` in all services.

### A3. `curo-shared` exists but isn't consumed ✅ *(fixed by Doc 04)*
The canonical entities/enums live in `packages/shared/`, yet every service copies
files manually (the source of A2). Since everything is already one root
`package.json` away, converting the repo root to **npm workspaces** and
importing `@curo/shared` would eliminate the copy-drift class of bugs entirely.
Cost: Dockerfiles need a workspace-aware build (copy root lockfile + shared
package). Worth doing before the service count grows again.

### A4. Duplicated `src/common/` across all 9 services ✅ *(fixed by Doc 04)*
`jwt-auth.guard.ts`, `roles.guard.ts`, `decorators.ts`, `fhir-bundle.ts` are
near-identical ×9. Same remedy as A3 (`@curo/shared` or `@curo/nest-common`).
Until then: any guard fix must be applied 9×; add that to the review checklist.

### A5. Every backend publishes its port to the host ✅ *(fixed 2026-10-07)*
> 2026-10-07 (`fix/security-hardening`): backends publish no host ports. Only the gateway and
> portals do; Postgres and MinIO bind to 127.0.0.1, Redis and the MinIO console publish nothing.
`docker-compose.yml` maps 3001–3009 to the host, so clients can bypass the
gateway (and its CORS/central JWT check — services do verify JWTs themselves,
so this is exposure rather than a hole). Only the gateway (3000) and frontends
need host ports; drop the rest (keep them reachable on the compose network).
Dev convenience can be restored with a `docker-compose.override.yml`.

### A6. Gateway header injection is dead code / mild risk ✅ *(fixed 2026-10-07)*
> 2026-10-07 (`fix/security-hardening`): the injection is removed (the gateway forwards the
> request unchanged). The gateway and every backend serve `GET /health` (one shared
> `registerHealthCheck`), and the compose health checks call it over HTTP.
The gateway injects `x-user-id/x-user-role/x-user-email`, but no service reads
them (each re-verifies the JWT itself — good). Either remove the injection, or
if it's ever used, the gateway must first **strip client-supplied `x-user-*`
headers** to prevent spoofing. Also: `/health` is listed as a public path but
returns 404 — add a real handler; compose healthchecks are `nc` port pokes and
would be better as HTTP checks against real `/health` endpoints.

### A7. Secrets hygiene ✅ *(fixed 2026-10-07)*
> 2026-10-07 (`fix/security-hardening`): compose reads every secret from a git-ignored `.env`
> (template: `.env.example`) and refuses to start without one. Postgres no longer uses `trust`
> auth. `secretFromEnv()` in `@curo/shared/config` makes production refuse the dev fallback
> for `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DB_PASS` and `MINIO_SECRET_KEY`.
JWT secrets, DB and MinIO credentials are hardcoded in `docker-compose.yml` and
as in-code fallbacks (`|| 'curo_jwt_secret_dev_2024_change_in_prod'` in every
guard). Move to a git-ignored `.env` consumed by compose; make services **fail
fast** when `JWT_SECRET` is unset instead of silently using the fallback.

### A8. Redis runs but nothing uses it
`redis:7` is in compose (and healthy) but no service references it. Either
remove it, or give it a job: gateway rate limiting (`@nestjs/throttler` +
redis storage) and/or caching the practitioner/organization lookups.

### A9. No transactional outbox for Kafka (accepted risk in Doc 01)
Doc 01's publishing is fire-and-forget after commit: a crash between DB write
and publish loses the event (missed notification/audit row). If notification
delivery ever becomes a hard requirement, add an outbox table + relay per
service, or Debezium CDC. Not worth it at current stakes — documenting so the
tradeoff is on record.

### A10. Multi-observation writes aren't atomic ✅ *(fixed 2026-10-07: `POST /encounters/visit`)*
`EncounterEditor.handleFinishVisit` makes ~5–15 sequential/parallel API calls
(encounter → note → N vitals → N prescriptions → N lab orders → status). A
mid-sequence failure leaves a partial visit with no retry/rollback. Options: a
clinical-service `POST /encounters/complete-visit` composite endpoint doing it
in one DB transaction, or at minimum client-side retry + idempotency keys.
(Doc 02 inherits this pattern for nurse vitals; acceptable there — vitals are
independent facts — but the composite-endpoint idea is worth doing later.)

### A11. Testing gap
Only scaffold `*.spec.ts` files exist; verification is manual/smoke-script
(`scripts/smoke-e2e.sh`, `docs/API_TESTING_PLAN.md`). Highest-value additions,
in order: (1) supertest e2e per service on the critical write flows, (2) unit
tests for pure logic that keeps growing (FHIR mappers, `assertQueueTransition`
from Doc 02, PHN Luhn, FEFO dispense), (3) a GitHub Action running
`tsc --noEmit` + tests per service. The queue-transition function in Doc 02 N2
is deliberately shaped to be the first unit-tested module.

### A12. Auth-service owns the canonical Patient entity by boot-order accident ✅ *(fixed by Doc 04)*
"Auth starts first and creates the full patients table; the patient service
entity must match or be a subset" is fragile tribal knowledge (already caused
the PHN synchronize hazard). Fold into A2's fix; until then it's documented in
BUILD_PROGRESS but not enforced anywhere.

---

## B. Frontend architecture

### B1. Six copies of the same infrastructure
`client.ts` (JWT refresh interceptor), `mappers.ts`, `AuthContext.tsx`, and
`components/ui/*` are duplicated per frontend, and they drift (receptionist's
mapper still had `visitId`; statuses diverged — A1). The nested-git-repos
constraint makes a shared package awkward, but a `curo-frontend-shared`
template dir + sync script (or promoting the frontends into the parent repo /
proper submodules + workspace) would pay for itself. This is the frontend twin
of A3/A4.
> 2026-10-06 (lint baseline): `AuthContext` and `apiErrorMessage()` were brought in line
> across the portals, but they are still copies. `AuthContext.tsx`, the API client and
> `hooks/use-client-pagination.ts` are the first things to move into the shared package.

### B2. All data fetching is `useEffect` + axios with no cache
Every page refetches everything on mount; polling is hand-rolled
`setInterval`s. TanStack Query would give caching, dedupe, `refetchInterval`,
and error/retry states with less code. Adopt in one frontend first (nurse or
doctor) as the pattern-setter. Related: many pages `"use client"` at the page
level where a server component + client leaf would cut bundle size (Next 16 is
being used as a pure SPA shell).

### B3. "Save Draft" in EncounterEditor is fake ✅ *(fixed by the doctor portal rework)*
> The visit flow now keeps real drafts in localStorage per appointment
> (`apps/doctor/src/lib/visit.ts`).
`handleSaveDraft` just toasts "Draft saved" — nothing persists. Either remove
the button or implement drafts (localStorage keyed by appointmentId would be a
90% solution; encounter `status: 'planned'` + PUT is the real one).

### B4. Static catalogs are drifting into the DB inconsistently
ICD-10 moved to a DB-backed `/icd10` endpoint and pharmacy got
`medication-catalog`, but the doctor FE still bundles JSON catalogs
(`icd10Catalog` prop, medications, lab tests). Pick one source per catalog and
delete the other; bundled JSON + DB copies will diverge.

### B5. Error boundaries and empty/loading states are uneven
`error.tsx` exists in doctor/receptionist dashboards but not everywhere; some
lists render nothing while loading. `EmptyState.tsx` exists in `components/ui`
— mandate it for all list pages (nurse frontend in Doc 02 should use it from
day one).

---

## C. Styling / design-system consistency

### C1. Hardcoded colors bypass the token system
The token system (`--status-*`, `--chart-*`, semantic `bg-muted`/
`text-muted-foreground`) is good and mostly followed, but there are strays:
`EncounterEditor`'s sticky header uses `bg-white` (should be `bg-background` or
`bg-card` — breaks any future dark theme), QueueBoard's "Send to Doctor" uses
`text-white` on primary (should rely on `text-primary-foreground`), and
several icons use raw palette classes (`text-rose-500` in VitalsPanel) where a
semantic token exists. Worth a one-pass sweep: grep `bg-white|text-white|-500`
across `src/` of all frontends and re-tokenize.

### C2. Badge/status styling is re-derived per component
Each component re-implements "which status token for which status" (QueueBoard
wait-time thresholds, VitalsPanel BMI variants, StatusBadge variants differing
per frontend). Consolidate into each frontend's `StatusBadge`/`lib/utils`
(`getStatusBadgeClass(status)`) and reuse — Doc 02's new badges should go
through the existing `StatusBadge` component, not new ad-hoc class strings.

### C3. Manual refresh patterns differ per screen
QueueBoard has a manual "Refresh" button doing `window.location.reload()` (full
page reload); Topbars poll every 30 s; other lists never refresh. Standardize:
poll interval per data-liveness class (queues 15 s, notifications 30 s, static
lists on-focus), and replace `window.location.reload()` with refetching state.
(Doc 02 sets the 15 s queue convention.)

### C4. Duplicated presentational logic
`calculateBMI`/`getBMICategory` live in each frontend's `lib/utils` (and the
BMI display block is about to be copied again for the nurse triage screen —
accepted in Doc 02 to follow the copy convention, but this is the B1 problem
in miniature). Same for `getPatientName`/`getDoctorName` lookup helpers.

### C5. Print styles are per-feature one-offs
Doctor e-prescription and lab labels each ship their own `@media print`
stylesheet approach. If more print surfaces come (Doc 03 future: lab report
print, income report), extract a shared print-layout convention (hide-app
shell class + printable region component) per frontend.

---

## D. Suggested sequencing if/when the user wants these done

1. **A2/A3/A12** entity-drift fix (workspaces + shared package) — removes the
   scariest failure mode; do before more entity-touching features.
2. **A5 + A7** compose hardening (ports + secrets) — small, high hygiene value.
3. **A11** test seed crystal: unit-test `assertQueueTransition` + one supertest
   flow; wire a CI workflow running `tsc --noEmit` everywhere.
4. **C1/C2** token sweep + StatusBadge consolidation — quick win, keeps 7
   frontends visually coherent.
5. **B2** TanStack Query in curo-nurse first, then migrate screens opportunistically.
6. **A6, A8, A10, B3, B4** as standalone small slices.
