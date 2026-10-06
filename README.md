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
scripts/             seed, smoke tests, docker helpers
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
cd services/patient && npm run start:dev
```

`npm run build` and `npm test` at the root run across every backend.

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
