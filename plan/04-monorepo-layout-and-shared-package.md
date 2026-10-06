# Doc 04 — Monorepo layout + `@curo/shared` (workspaces)

**Status: ✅ done (2026-10-06).** Implements Doc 03 items **A2 (drift), A3, A4, A12**.

## Why

Baseline audit (2026-10-06) of the backends:

| Duplicated thing | Copies | State |
|---|---|---|
| `common/{decorators,jwt-auth.guard,roles.guard}.ts` | 8 | byte-identical |
| `common/fhir-bundle.ts` | 8 | byte-identical |
| `main.ts` bootstrap | 9 | identical except title/description/port |
| `TypeOrmModule.forRoot({...})` | 9 | identical except entity list |
| JWT secret literal fallback | 22 | identical |
| Backend `Dockerfile` | 10 | identical except `EXPOSE` |
| Frontend `Dockerfile` | 7 | identical except port + comments |
| `tsconfig.json` | 10 | identical |
| Entities mapped by ≥2 services | 6 tables | **drifted**: a dry run shows patient-service would `ALTER COLUMN gender SET NOT NULL` on boot and auth-service would undo it |

All 9 services run `synchronize: true` on one DB, so a drifted copy is a live
schema hazard (Doc 03 A2/A12), not just untidiness. `curo-shared` exists but
nothing imports it — its copies are stale.

## Principles

- **KISS:** npm workspaces only; no Turborepo/Nx/project references. One shared package.
- **DRY:** one definition per table, per guard, per Dockerfile, per tsconfig.
- **Bounded contexts:** a service owns its tables. Only what genuinely crosses
  service boundaries goes in the shared package (a minimal *shared kernel*).
- **Dependency rule:** `services/* → packages/shared`, never the reverse;
  services never import each other.
- **Behaviour-neutral:** no API, port, compose service name or DB schema changes.

## Target layout

```
apps/                 7 Next.js portals (standalone npm projects — see "Out of scope")
  admin doctor lab nurse patient pharmacy receptionist
  Dockerfile          one shared Next.js standalone Dockerfile
services/             10 NestJS backends — npm workspaces @curo/<name>-service
  api-gateway appointment audit auth clinical document lab notification patient pharmacy
  Dockerfile          one shared NestJS Dockerfile (build-arg SERVICE)
packages/shared/      @curo/shared
tsconfig.base.json    compiler options shared by services + package
package.json          workspaces: ["packages/*", "services/*"]
scripts/ docs/ plan/  unchanged
```

Compose **service names, container names, ports and hostnames stay the same**
(`curo-auth-service`, …), so gateway URLs, scripts and docs that talk to running
containers are unaffected. Only build paths change.

## `@curo/shared` — one package, one entry point per concern

Subpath exports, so a consumer only loads what it imports (the gateway needs
`auth` but has no TypeORM):

| Import | Contents |
|---|---|
| `@curo/shared/auth` | `JwtAuthModule` (global; registers `JwtModule` + guards), `JwtAuthGuard`, `RolesGuard`, `Roles`, `CurrentUser`, `ROLES_KEY`, `jwtSecret()` |
| `@curo/shared/database` | `databaseOptions(entities)` + the shared-kernel entities |
| `@curo/shared/enums` | enums used by a shared entity or by ≥2 services |
| `@curo/shared/fhir` | `parsePagination`, `toSearchset` (from `fhir-bundle.ts`) |
| `@curo/shared/bootstrap` | `bootstrapService(AppModule, { title, description, defaultPort })` |

Framework libs (`@nestjs/*`, `typeorm`) are **peerDependencies** so every
service and the package resolve the *same* instance (decorator metadata and DI
tokens break across duplicate copies).

**Shared-kernel rule:** an entity lives in `@curo/shared/database` iff ≥2
services register it in `TypeOrmModule.forRoot` (not merely have the file).
Today that is exactly 6: `AuditLog, MedicationRequest, Observation, Patient,
QrCode, ServiceRequest`. None has relations; they depend only on 5 enums.
Everything else stays in its owning service's `src/entities/` (`User` is
auth-only; patient-service's `user.entity.ts` is dead code and is deleted).

Canonical version per shared entity = the variant matching the live DB.
Differences found were comments only, except `Patient`: canonical = patient-service's
file with `gender` nullable (auth's variant, which matches the live schema).

**Schema safety net:** a dry-run script asks TypeORM, per service, what SQL
`synchronize` *would* run against the live DB (`createSchemaBuilder().log()`).
Before: 1 pending change (the gender flip-flop). After Phase 3: **0 for every
service** — checked on the host before any new image boots. Full data dump taken
beforehand (`~/curo-backups-2026-10-06/db-before.dump`).

**Intentional behaviour changes** (everything else is neutral):
- `jwtSecret()` keeps today's dev fallback but **throws if `JWT_SECRET` is unset
  when `NODE_ENV=production`** (Docker images set production; compose sets the secret).
- The single root lockfile is resolved fresh, so deps may move to newer
  minor/patch versions within their existing `^` ranges.
- The Swagger CLI plugin does not run on the shared package, so shared entities
  must not lose schema detail — `/openapi.json` is diffed against a baseline.

## Phases (one commit each, verified before the next)

1. **Layout** — `git mv` into `apps/ services/ packages/`; update compose build
   contexts, scripts, docs paths. No code changes.
   *Verify:* every backend builds + unit tests pass in its new place; `docker compose config` valid.
2. **Workspaces + package scaffold** — root `workspaces`, `tsconfig.base.json`,
   `@curo/shared` with build + exports; single root lockfile (per-service
   lockfiles removed); root dev deps aligned (typeorm 1.x, pg) so only one copy hoists.
   *Verify:* `npm ci` + `npm run build` at root; one hoisted `typeorm`/`@nestjs/common`.
3. **Adopt the shared package** — services import guards/decorators, fhir helpers,
   bootstrap, db options, shared entities + enums from `@curo/shared/*`; delete
   local copies and stale `curo-shared` files.
   *Verify:* all builds + 19 unit tests pass; `grep` finds no leftover copies;
   schema dry run reports 0 pending changes for every service.
4. **Docker** — one `services/Dockerfile`, one `apps/Dockerfile`, root `.dockerignore`,
   seed Dockerfile on the workspace lockfile, compose anchors.
   *Verify:* sequential rebuild of every image; stack healthy;
   **`pg_dump --schema-only` identical to the pre-change baseline**;
   `/openapi.json` equal to baseline; `docker compose config` differs only in `build:`;
   `scripts/smoke-e2e.sh` = PASS 109 / FAIL 0 (baseline).
5. **Docs** — root README dev workflow, BUILD_PROGRESS, Doc 03 status, memory.

## Out of scope (deliberately)

- **Frontends in workspaces.** They share no code yet; adding them now only
  costs (single lockfile across 7 Next apps, standalone-output tracing changes)
  with no benefit. Do it together with Doc 03 B1 (shared frontend package).
- **Migrations / `synchronize: false`** (Doc 03 A2 option 3). One definition per
  table removes the drift; migrations are the next step, separately.
- Replacing direct shared-table access with service APIs (true bounded contexts).

## Result (2026-10-06)

- Schema dry run (TypeORM `createSchemaBuilder().log()` vs live DB): 1 pending
  change before (the `patients.gender` flip-flop) → **0 for every service** after.
- All 18 images rebuilt sequentially; stack healthy; seed exited 0.
- `pg_dump --schema-only`: identical to baseline (only pg_dump's random `\restrict` token differs).
- `scripts/smoke-e2e.sh`: **PASS 109 / FAIL 0** (same as baseline). 19 unit tests pass.
- `/openapi.json`: same 76 paths and schemas. Two diffs, neither from this change:
  `AuditLog.changes` gains `additionalProperties: true` (Swagger plugin 11.4.4 → 11.4.7
  via the fresh lockfile), and `GET /prescriptions/pending` is defined by **both**
  clinical and pharmacy — the gateway's spec merge keeps whichever responds first.
  That collision predates Doc 04; worth resolving separately.
- About 2,700 lines of duplicated code removed; 17 Dockerfiles + 17 dockerignores → 2 + 2.
