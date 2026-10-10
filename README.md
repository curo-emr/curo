# Curo EMR

Electronic medical records platform: NestJS backends with FHIR-shaped APIs,
a PostgreSQL database and seven role-specific Next.js portals.

> [!WARNING]
> Curo is under active development. It has not been certified or validated as a
> medical device, or for clinical use, anywhere. If you deploy it, you are responsible
> for its clinical safety and for complying with data-protection law where you run it
> (in Sri Lanka, the Personal Data Protection Act, No. 9 of 2022).

## Repository layout

```
apps/                Next.js portals (npm workspaces, @curo/<name>-portal)
  admin doctor lab nurse patient pharmacy receptionist
  Dockerfile         shared by every portal (--build-arg APP=<name>)
services/            NestJS backends (npm workspaces, @curo/<name>-service)
  api-gateway auth patient appointment clinical pharmacy lab document notification audit
  Dockerfile         shared by every backend (--build-arg SERVICE=<name>)
packages/shared/     @curo/shared — code used by more than one backend
packages/testing/    @curo/testing — harness for the backends' API tests (dev only)
packages/web/        @curo/web — code used by more than one portal
database/            migrations, seed, and the image that runs them
scripts/             smoke tests, docker helpers
docs/                API docs, test credentials, manual testing guide
```

## Run everything (Docker)

```bash
cp .env.example .env      # once: secrets for compose (dev values; never commit .env)
npm run docker:rebuild    # builds images one at a time, then `docker compose up -d`
```

Gateway on :3000 (API reference at http://localhost:3000/docs), portals on
:3010–:3016. Seed accounts are listed in [docs/TEST_CREDENTIALS.md](docs/TEST_CREDENTIALS.md).

Only the gateway and the portals are published to the host. The backends are
reachable only through the gateway; Postgres (:5432) and MinIO (:9000) listen
on 127.0.0.1 for running code from source. Every backend and the gateway answer
`GET /health`, which the compose health checks use.

Production images (`NODE_ENV=production`) refuse to start without `JWT_SECRET`,
`JWT_REFRESH_SECRET`, `DB_PASS` and, for the document service, `MINIO_SECRET_KEY`.
Outside production a service run from source falls back to the dev values in
`.env.example`.

## Develop a backend

```bash
npm install                                  # once, at the repo root
npm run build:shared                         # services import the built package
docker compose up -d postgres                # needs .env (above), or point DB_* at your own Postgres
npm run db:migrate && npm run seed           # schema + dev data
cd services/patient && npm run start:dev
```

`npm run build` and `npm test` at the root run across every backend.

Use npm, not yarn, pnpm or bun: every workspace shares the one `package-lock.json`.
`npm install` checks this first, and yarn and pnpm stop with an error. Bun skips
the check, but CI's `npm ci` fails if `package-lock.json` no longer matches.

## Develop a portal

```bash
npm install                                  # once, at the repo root: one lockfile for everything
npm run dev -w apps/doctor                   # or: cd apps/doctor && npm run dev
```

Portals import shared code from [@curo/web](#curoweb). It ships as TypeScript source,
so there is nothing to build first; Next compiles it with the portal.
`npm run build:portals` and `npm run lint:portals` run across every portal.

## Tests

The backends' tests need Node 24.9 or later (`.nvmrc` pins Node 24). NestJS ships as ES
modules, and only from that version can Jest `require()` them; `.npmrc` turns on the
VM modules API that Jest uses for this, for every npm script.

| Script | Runs | Needs |
|---|---|---|
| `npm test` | unit tests (`src/**/*.spec.ts`): pure logic such as queue moves, PHN check digits, FEFO dispensing | nothing |
| `npm run test:e2e` | API tests (`test/*.e2e-spec.ts`): each service's HTTP endpoints, in-process, on a real database | Postgres (`docker compose up -d postgres`) and a built `@curo/shared` |
| `npm run typecheck` | `tsc --noEmit` over every workspace, tests included, and `database/` | nothing |

The API tests never touch `curo_db`. Before each service's run, the
[@curo/testing](packages/testing) preset drops and recreates `curo_test` (or `TEST_DB_NAME`,
which must end in `_test`) and applies the migrations to it. To write one:

```ts
import { MedicationRequest } from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';

let svc: ServiceUnderTest;
beforeAll(async () => (svc = await startService(AppModule)));
afterAll(() => svc.close());

it('dispenses', async () => {
  const rx = await svc.db.getRepository(MedicationRequest).save({ ... }); // fixtures go straight in
  await svc.api
    .post('/dispense')
    .set(svc.as(UserRole.PHARMACIST).headers) // a signed token for any role
    .send({ medicationRequestId: rx.id })
    .expect(201);
});
```

Tests share the database, so each one creates its own rows (fresh ids) and checks only those.
To replace a provider, such as object storage, pass overrides:
`startService(AppModule, [{ provide: STORAGE_PROVIDER, useValue: memoryStorage }])`.

## Database schema

Services never change the schema (`synchronize` is off). TypeORM migrations in
[database/migrations](database/migrations) do. In Docker, the one-shot `curo-migrate`
container applies them before any backend starts.

To change the schema:

1. Edit the entity. If it lives in `@curo/shared`, run `npm run build:shared` afterwards.
2. Run `npm run db:generate -- migrations/AddPatientNickname`. This diffs the entities
   against your local database and writes the SQL.
3. Review the generated file, then apply it with `npm run db:migrate`.
4. Commit the entity change and the migration together.

| Script | Does |
|---|---|
| `npm run db:migrate` | apply pending migrations |
| `npm run db:revert` | undo the most recent migration (the baseline refuses) |
| `npm run db:generate -- migrations/<Name>` | write a migration from entity changes |
| `npm run db:check` | fail if the entities and the database schema differ (CI runs this) |
| `npm run seed` | load dev data; safe to re-run |

## CI

Branch naming and the pull request process are in [CONTRIBUTING.md](CONTRIBUTING.md).

[CI](.github/workflows/ci.yml) runs on every PR and on pushes to `main` and release branches.
A PR runs only the jobs its changes can affect: a portal is built when it or `@curo/web`
changes, and the Backends job runs for `services/`, `packages/` and `database/`. Changes to
the lockfile, Node version or CI run everything, and so does every push. The rules are in
[ci-scope.sh](.github/scripts/ci-scope.sh); `BASE=origin/main .github/scripts/ci-scope.sh` shows
what a branch would run. The secret scan always runs.

`main` only takes changes through pull requests, and only once the `CI` job passes. That job
sums up the others: it fails when any of them fails, and a skipped job counts as passing.

| Job | Checks | Run it locally |
|---|---|---|
| Backends | build `@curo/shared` + every service, lint, unit tests, API tests, type-check every workspace (tests included) and `database/`, then on an empty Postgres: migrate, check for entity drift, seed | `npm ci && npm run build && npm run lint && npm test && npm run test:e2e && npm run typecheck`, then `npm run db:migrate && npm run db:check` |
| Frontend | for each portal: lint, then `next build` (includes type-check); lint `@curo/web` | `npm ci && npm run lint:portals && npm run build:portals` |
| Secret scan | gitleaks over the full git history ([allowlist](.gitleaks.toml)) | `docker run --rm -v "$PWD:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 git /repo` |

### Lint and formatting

Backends (`services/`, `packages/shared`, `database/`) share one
[ESLint config](eslint.config.mjs) and one [Prettier config](.prettierrc.json).
Each portal, and `@curo/web`, keeps its own Next.js ESLint config.

- `npm run lint` checks without changing anything (this is what CI runs);
  `npm run lint:fix` fixes and formats. In a portal, use `npm run lint` there.
- Lint errors fail CI; warnings don't. The `no-unsafe-*` rules are warnings while
  `any` is typed out of query results and request bodies, and will become errors
  again service by service.
- Turn on format-on-save with the Prettier and ESLint extensions; VS Code suggests
  them from `.vscode/extensions.json`.
- The bulk formatting commit is listed in `.git-blame-ignore-revs`. GitHub skips it
  automatically; for local blame, run
  `git config blame.ignoreRevsFile .git-blame-ignore-revs` once.

## `@curo/shared`

One package, one entry point per concern, so a service imports only what it needs:

| Import | Contents |
|---|---|
| `@curo/shared/auth` | `JwtAuthModule`, `JwtAuthGuard`, `RolesGuard`, `@Roles`, `@CurrentUser`, `jwtSecret()` |
| `@curo/shared/database` | `databaseOptions()` and entities for tables used by more than one service |
| `@curo/shared/enums` | enums used by a shared entity or by more than one service |
| `@curo/shared/fhir` | `parsePagination`, `toSearchset` |
| `@curo/shared/bootstrap` | `bootstrapService()` — pipes, CORS, OpenAPI, listen |

Rule of thumb: code moves into the package only once a second service needs
it. A table owned by one service keeps its entity in that service.

## `@curo/web`

The portals' counterpart to `@curo/shared`, with the same layout: one entry point per concern.

| Import | Contents |
|---|---|
| `@curo/web/api` | `apiClient` (axios with the session's token; refreshes it once on a 401), `apiErrorMessage()`, `getAllPages()` (every page of a list a filter bounds), `getByIds()` (FHIR `_id` lookups, 100 ids a request), `findPatientIds()` (the patients a name search matches, for lists that search by patient), `getTotal()` (a list's row count) |
| `@curo/web/auth` | `AuthProvider` and `useAuth()`: the signed-in user, `login`, `logout`; `ProtectedRoute`, limited to the portal's `roles` |
| `@curo/web/fhir` | `unwrapBundle`, `paginationParams`, and the Bundle and pagination types |
| `@curo/web/format` | `formatStatus()`: a snake_case code as sentence-case text (`not_arrived` → "Not arrived") |
| `@curo/web/hooks` | `useServerPagination` (a server-paged list that refetches when its filters change), `useClientPagination`, `useDebouncedValue` |
| `@curo/web/ui/<name>` | the shadcn/ui primitives (`button`, `dialog`, `select`, …); Curo's own `page-header`, `section-card`, `empty-state`, `status-badge`, `search-input`, `file-input`, `curo-calendar`, `sidebar-context`; `cn` in `ui/utils` |
| `@curo/web/print` | `printOnly(id)`: print just one element of the page |
| `@curo/web/styles.css` | the theme: colour tokens (including the status palette), base styles, print rules |

A portal that needs more than the login response about its user passes `enrichUser`
to `AuthProvider` (the doctor portal looks up the doctor's specialty), and `onLogout`
for anything to drop on sign-out.

The same rule of thumb applies: code moves in once a second portal needs it. The
shadcn/ui primitives are the exception: they all live here, so the portals look alike.

- A portal's `globals.css` is one line, `@import "@curo/web/styles.css"`. The stylesheet
  also tells Tailwind to scan the package, so the shared components get their classes.
- `StatusBadge` holds every status the portals show, each with one colour and label
  everywhere. Its `status` prop accepts only those statuses, so a new one fails the
  type-check until it is added there. Filters, tabs and pickers that name a status use
  its `statusLabel()` (and `statusClassName()` to look like the badge), not their own text.
- `npm run ui:add -w @curo/web -- <component>` adds a shadcn/ui component to
  `packages/web/src/ui`, exactly as shadcn ships it. Components import `cn` from shadcn's
  [`cn`](https://github.com/shadcn-ui/cn) package (Tailwind class merging, in place of
  clsx + tailwind-merge); portals import it from `@curo/web/ui/utils`.


## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first, and follow the
[Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities privately, as described in
[SECURITY.md](SECURITY.md).

## License

Copyright © 2026 Dilantha Wijesinghe.

Curo is free software: you can redistribute it and/or modify it under the terms of the
[GNU Affero General Public License](LICENSE), version 3 or (at your option) any later
version. If you run a modified version for users over a network, the license requires
you to offer those users its source code.
