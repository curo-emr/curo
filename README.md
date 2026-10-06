# Curo EMR

Electronic medical records platform: NestJS backends with FHIR-shaped APIs,
a PostgreSQL database and seven role-specific Next.js portals.

## Repository layout

```
apps/                Next.js portals (each a standalone npm project)
  admin doctor lab nurse patient pharmacy receptionist
  Dockerfile         shared by every portal
services/            NestJS backends (npm workspaces, @curo/<name>-service)
  api-gateway auth patient appointment clinical pharmacy lab document notification audit
  Dockerfile         shared by every backend (--build-arg SERVICE=<name>)
packages/shared/     @curo/shared — code used by more than one backend
database/            migrations, seed, and the image that runs them
scripts/             smoke tests, docker helpers
docs/  plan/         API docs, test credentials, design plans
```

## Run everything (Docker)

```bash
npm run docker:rebuild    # builds images one at a time, then `docker compose up -d`
```

Gateway on :3000 (API reference at http://localhost:3000/docs), portals on
:3010–:3016. Seed accounts are listed in [docs/TEST_CREDENTIALS.md](docs/TEST_CREDENTIALS.md).

## Develop a backend

```bash
npm install                                  # once, at the repo root
npm run build:shared                         # services import the built package
docker compose up -d postgres                # or point DB_* env vars at your own Postgres
npm run db:migrate && npm run seed           # schema + dev data
cd services/patient && npm run start:dev
```

`npm run build` and `npm test` at the root run across every backend.

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

## Branches and CI

Work happens on short-lived branches named by type: `feat/`, `fix/`, `docs/`, `ci/`,
`chore/`, `refactor/`, `test/` (e.g. `feat/nurse-vitals-history`). Open a PR into `main`.
Release branches are `dev-release/<x.y.z>`, `qa-release/<x.y.z>` and `stg-release/<x.y.z>`.

[CI](.github/workflows/ci.yml) runs on every PR and on pushes to `main` and release branches:

| Job | Checks | Run it locally |
|---|---|---|
| Backends | build `@curo/shared` + every service, lint, unit tests, type-check `database/`, then on an empty Postgres: migrate, check for entity drift, seed | `npm ci && npm run build && npm run lint && npm test && npm run typecheck:db`, then `npm run db:migrate && npm run db:check` |
| Portals | lint, then `next build` (includes type-check) for each of the 7 portals | `cd apps/<app> && npm ci && npm run lint && npm run build` |
| Secret scan | gitleaks over the full git history ([allowlist](.gitleaks.toml)) | `docker run --rm -v "$PWD:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 git /repo` |

### Lint and formatting

Backends (`services/`, `packages/shared`, `database/`) share one
[ESLint config](eslint.config.mjs) and one [Prettier config](.prettierrc.json).
Each portal keeps its own Next.js ESLint config.

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
