# Curo EMR — API Verification, Documentation & Testing Plan

Living tracker for the API-quality work: verifying every endpoint, standing up API docs, and
producing manual test material. Update the checkboxes as items land.

**Status:** in progress · **Last updated:** 2026-06-21

## Goals

1. Confirm every endpoint works through the gateway with the correct role. → `API_VERIFICATION.md`
2. Stand up real, browsable API documentation. → `API_DOCUMENTATION.md` + http://localhost:3000/docs
3. Provide a manual, portal-by-portal test walkthrough. → `MANUAL_TESTING_GUIDE.md`
4. Collect all test-account credentials in one place. → `TEST_CREDENTIALS.md`
5. Keep this plan/checklist current. → this file

## Deliverables

| Artifact | Path | Status |
|---|---|---|
| Endpoint smoke-test script | `scripts/smoke-e2e.sh` | ✅ done |
| Verification report | `docs/API_VERIFICATION.md` | ✅ done (83/83 pass) |
| Credentials reference | `docs/TEST_CREDENTIALS.md` | ✅ done |
| Manual testing guide (UI + API) | `docs/MANUAL_TESTING_GUIDE.md` | ✅ done |
| API documentation strategy | `docs/API_DOCUMENTATION.md` | ✅ done |
| Living plan/checklist | `docs/API_TESTING_PLAN.md` | ✅ done |

## Checklist

### Phase 1 — Verify every endpoint
- [x] Build threaded `scripts/smoke-e2e.sh` (full clinical journey + reads + authz spot-checks)
- [x] Run through the gateway with real JWTs — **83/83 checks pass, 0 failures**
- [x] Document findings & known quirks (`/organizations` works; pharmacy `/prescriptions/pending`
      shadowed; gateway `/health` 404; document type allow-list)
- [x] Note DB-mutation caveat + reset path

### Phase 2 — API documentation (auto-generated, aggregated at gateway)
- [x] Add `@nestjs/swagger` to `dependencies` in all 9 domain services (lockfiles regenerated)
- [x] Enable Swagger CLI plugin in each `nest-cli.json`
- [x] Wire `SwaggerModule` into each service `main.ts` (`/api-docs` + `/api-docs-json`)
- [x] Gateway: fetch + merge specs, serve `/openapi.json` + Scalar `/docs`, exclude from proxy
- [x] Verify per-service generation host-side: built auth against the live DB →
      `GET :3101/api-docs-json` = valid OpenAPI 3 spec (11 paths, bearer scheme). ✅
- [x] Verify gateway aggregation host-side: ran auth(:3101)+clinical(:3104)+gateway(:3100) →
      `GET :3100/openapi.json` merged **30 paths**, single server, global bearerAuth; `/docs`
      served the Scalar page; swagger-less services skipped gracefully. ✅
- [ ] **Rebuild dockerized images** so `:3000/docs` is live — run `docker compose up -d --build`
      in a normal-network environment. Blocked in the dev sandbox only: `npm ci` inside Docker
      crashes (`Exit handler never called!`) on registry-fetch timeouts (npm 10.8 bug). Code is
      correct; the running containers still use pre-Swagger images until rebuilt.

### Phase 3 — Credentials & manual guide
- [x] `TEST_CREDENTIALS.md` — all staff + patient accounts, seeded data, reset steps
- [x] `MANUAL_TESTING_GUIDE.md` — portal-by-portal journey with UI + API per step
- [ ] Dry-run the manual guide once by hand through all 5 portals

### Phase 4 — Housekeeping
- [ ] Decide whether to commit (`docs/`, `scripts/smoke-e2e.sh`, swagger wiring, lockfiles)
- [ ] Consider adding a real gateway `/health` handler (currently 404)

## Notes / decisions
- **Domain-driven services kept** (not per-frontend) — settled architecture.
- **Auto-generated** Swagger chosen over hand-authored (API still evolving) — see `API_DOCUMENTATION.md`.
- **Aggregated at the gateway** (one spec) chosen over 10 per-service UIs — matches the single-gateway model.
- `@nestjs/swagger` lives in `dependencies` (survives `npm ci --omit=dev` in the runtime stage).
- **Dockerfiles left pristine.** A retry/cache-mount build hack was explored but reverted: it
  couldn't be validated in this sandbox (the npm crash defeats every variant) and the original
  `npm ci` builds correctly on a normal network. Optional future hardening (for flaky CI
  networks): a BuildKit npm-cache mount + `npm ci --no-audit --no-fund` — not committed.
