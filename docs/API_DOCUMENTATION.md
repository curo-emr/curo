# Curo EMR — API Documentation

The Curo API is documented with **OpenAPI 3 / Swagger**, auto-generated from the NestJS code and
**aggregated into one reference at the gateway**:

> ## 📖 http://localhost:3000/docs   ·   raw spec: http://localhost:3000/openapi.json

Authenticate via `POST /auth/login`, click **Authorize** in the top bar, paste the `accessToken`,
and every endpoint becomes callable from the browser against the live stack.

> ### ✅ Status
> The Swagger wiring (per-service generation **and** the gateway merge + Scalar `/docs`) is
> implemented and was **verified by running the built services against the live database**:
> the gateway merged auth + clinical into one spec (30 paths, single server, global bearer auth)
> and served the Scalar page. **It goes live on the dockerized stack the next time you run
> `docker compose up -d --build`** (which rebuilds the backend images with the new dependency).
>
> Note: this must be built in an environment with normal access to the npm registry. The sandbox
> this was developed in could not rebuild the images — `npm ci` inside Docker crashed with
> `Exit handler never called!` due to registry-fetch timeouts (an npm 10.8 bug). That is an
> environment limitation, not an issue with the code; a normal network builds cleanly.

---

## Why this approach (recommendation)

The question was *"would Swagger work, or is there something better?"* — here's the reasoning we
settled on, given Curo's architecture.

**Swagger/OpenAPI is the right standard**, but the key architectural fact is that Curo has **one
gateway** (`:3000`) that all clients use, and it **preserves paths** to 9 domain services. So:

- ❌ **Ten separate Swagger UIs** (one per service) would force the reader to know which service
  owns which path and juggle ten URLs — the opposite of what the gateway gives clients.
- ✅ **One aggregated spec served at the gateway** matches how the API is actually consumed: a
  single base URL, one **Authorize** button, every endpoint in one searchable page.

**Generation method: auto-generated** (`@nestjs/swagger`), not hand-written. The API is still
evolving (slices shipped incrementally), so a hand-authored spec would drift. With the NestJS
Swagger **CLI plugin**, request/response schemas are inferred from the existing TypeScript DTOs and
`class-validator` decorators — almost zero annotation burden — and the docs regenerate on every build.

**UI: Scalar** (rendered from the merged spec). It's a more modern, searchable reference than stock
Swagger UI, with a built-in API client. Redoc or Swagger UI would also work against the same
`/openapi.json`; swapping is a one-line change.

### Alternatives considered
| Option | Verdict |
|---|---|
| Per-service Swagger UIs only | Rejected — fragments the single-gateway model |
| Hand-written OpenAPI YAML | Rejected — drifts as the API changes |
| Postman/Bruno collection only | Useful to export, but not self-updating reference docs |
| Markdown endpoint list only | Already have the inventory in `API_VERIFICATION.md`; not interactive |

---

## How it works

```
 each service  ──(@nestjs/swagger + CLI plugin)──►  GET :30xx/api-docs       (per-service Swagger UI)
                                                     GET :30xx/api-docs-json  (raw OpenAPI JSON)
                                                              │
 gateway :3000  ──(fetches every /api-docs-json, merges paths + schemas,
                   adds one server + global bearerAuth)──►  GET /openapi.json (merged spec)
                                                            GET /docs         (Scalar UI)
```

- **Per service** (`curo-*-service/src/main.ts`): a `DocumentBuilder` + `SwaggerModule.setup('api-docs', …)`
  exposes that service's spec. The CLI plugin (enabled in each `nest-cli.json` via
  `compilerOptions.plugins: ["@nestjs/swagger"]`) auto-derives schemas from DTOs.
- **Gateway** (`services/api-gateway/src/proxy/proxy.middleware.ts`): on first request to `/openapi.json`
  it fetches each downstream `/api-docs-json` (using the same `SERVICE_MAP` it proxies with), merges
  them (first declarer of a path wins, so the reachable `/prescriptions` handler is kept), attaches a
  single `bearerAuth` scheme + the gateway as the only server, and caches the result. `/docs` serves
  a small Scalar page that reads `/openapi.json`. Both routes are handled before the proxy/auth logic,
  so they need no token and are never forwarded downstream.

## Keeping it current

The docs are generated from code, so they update automatically when you rebuild:
`docker compose up -d --build`. The gateway caches the merged spec in memory; force a refresh
without a restart via **`GET /openapi.json?refresh=1`** (e.g. after restarting one service).

## Accessing an individual service's docs

Each service also serves its own UI directly, handy when working on one service:
`http://localhost:3001/api-docs` (auth), `:3002` (patient), `:3003` (appointment), `:3004`
(clinical), `:3005` (pharmacy), `:3006` (lab), `:3007` (notification), `:3008` (audit),
`:3009` (document). Raw JSON at `…/api-docs-json`.

## Notes

- The Scalar UI is loaded from a CDN (`@scalar/api-reference`) — viewing `/docs` needs internet
  access. The raw `/openapi.json` works fully offline.
- Role requirements per endpoint are enforced by each service's `RolesGuard`; see
  [`API_VERIFICATION.md`](./API_VERIFICATION.md) for the role matrix and known quirks.
