# Docker build failure — `npm ci` crash in backend images

> **Update 2026-10-06 (Doc 04):** the ten per-service backend Dockerfiles are now one
> `services/Dockerfile` (build context = repo root, `--build-arg SERVICE=<name>`), installing from
> the root workspace lockfile. The fixes below (NODE_IMAGE / NPM_REGISTRY args, cache mounts,
> retry flags, install validation) carried over unchanged.

## Resolution implemented

This build blocker has been resolved in the repo:

- Backend and gateway Dockerfiles now default to `node:22-alpine` and accept `NODE_IMAGE` /
  `NPM_REGISTRY` build args.
- Docker installs no longer copy per-service `.npmrc` files; npm retry/audit/fund behavior is set
  directly in the Dockerfile install commands.
- `npm ci` layers use a BuildKit cache mount and validate the install before the layer can be
  cached:
  - production stage checks `@nestjs/core` resolves.
  - builder stage checks `node_modules/.bin/nest` exists.
- `scripts/build-backends-with-local-npm-registry.sh` starts a host Verdaccio proxy/cache and builds
  the backend images with `NPM_REGISTRY=http://host.docker.internal:4873`.
- Root script added:

```bash
npm run docker:build:backends
```

Verification on 2026-06-21:

- `npm run docker:build:backends` rebuilt the nine backend services plus the API gateway.
- `docker compose up -d` recreated the backend containers and gateway; all reached healthy state.
- `./scripts/smoke-e2e.sh` passed: `PASS=83`, `FAIL=0`.
- `GET http://localhost:3000/openapi.json` returned OpenAPI 3.0.0 with 71 paths and bearer auth.
- `GET http://localhost:3000/docs` returned HTTP 200.

Original writeup follows for historical context. The goal was to rebuild the 9 NestJS backend
service images after adding `@nestjs/swagger` (to expose `/docs`). At the time, the images **would
not rebuild on this machine** because `npm ci` inside the Docker build crashed. The application code
was complete and verified; this was purely a Docker-build / network problem.

## TL;DR

- Every fresh `npm ci` inside a Docker build **crashes with `npm error Exit handler never called!`**
  and then **exits 0**, leaving an incomplete `node_modules` (no `.bin/nest`). The next step,
  `RUN npm run build` (`nest build`), then fails: `sh: nest: not found` → `exit code: 127`.
- Because the crashed `npm ci` exits 0, **BuildKit caches the broken layer**, so subsequent builds
  fail identically even when "CACHED".
- Root trigger: the **Docker build VM's network to the npm registry intermittently hangs/times out**
  on individual requests (observed a single request hang past **600 s**). The **host** network to the
  same registry is fine (≈2 s/request). npm 10.8.2 turns the eventual fetch failure into the fatal
  `Exit handler never called!` crash instead of erroring cleanly.

## Environment

| | |
|---|---|
| Host node / npm | v24.13.1 / 11.8.0 |
| Container base image | `node:20-alpine` → **node v20.20.2 / npm 10.8.2** |
| Docker | 29.5.3 |
| Docker Compose | v5.1.4 |
| Platform | macOS (Apple Silicon) → Docker Desktop linux VM |
| Affected | 9 NestJS backend services (auth, patient, appointment, clinical, pharmacy, lab, notification, audit, document). Gateway + 6 Next.js frontends + seed build fine. |

## The Dockerfile (uniform across the 9 services)

3-stage build. Both `deps` and `builder` run `npm ci`:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++          # bcrypt (auth) needs build tools
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci --omit=dev

FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build                                # nest build  → fails: sh: nest: not found

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/main"]
```

(`@nestjs/cli`, which provides `nest`, is a `devDependency` — present in the `builder` stage's full
`npm ci`, absent from `deps`'s `--omit=dev`. The runtime needs `@nestjs/swagger`, which is a
regular `dependency`, so it survives `npm ci --omit=dev`.)

## Exact failure

```
#13 [builder 5/7] RUN npm ci
#13 759.9 npm error Exit handler never called!
#13 759.9 npm error This is an error with npm itself. Please report this error at:
#13 759.9 npm error   <https://github.com/npm/cli/issues>
...
#17 [builder 7/7] RUN npm run build
#17 0.627 sh: nest: not found
#17 ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 127
```

npm debug log just before the crash (from an earlier run):
```
verbose audit error FetchError: request to https://registry.npmjs.org/-/npm/v1/security/audits/quick failed, reason:
verbose audit error   code: 'ETIMEDOUT', errno: 'ETIMEDOUT', type: 'system'
error Exit handler never called!
```

## Root-cause evidence

1. **It's the install crashing, not a missing dep.** `@nestjs/cli` is present in `package.json`
   devDependencies and in `package-lock.json`. A clean `npm ci` of the same `package.json` +
   `package-lock.json` **on the host succeeds** and produces `node_modules/.bin/nest`.

2. **The crash leaves a partial tree but exits 0.** After the crash, `node_modules/@nestjs/cli`
   exists but `node_modules/.bin/nest` does not — the install aborted before linking bins. The RUN
   step still returns 0, so BuildKit caches it. This is why `CACHED [builder 5/7] RUN npm ci`
   followed by a `nest: not found` failure is seen.

3. **The trigger is the VM↔registry network, and it's intermittent.**
   - From inside a fresh container: DNS resolves, TLS connects, `GET https://registry.npmjs.org/npm`
     returns **200** — but **time_total swung between ~2 s and ~7 s**, and during `npm ci` at least
     one request **hung past the 600 s timeout** we configured (crash timestamp was **759.9 s**).
   - From the **host** at the same moments: ~2 s, stable, never hangs.
   - So it is specifically the Docker Desktop build VM's path to the registry that intermittently
     stalls individual connections. `--network=host` did **not** help.

4. **npm 10.8.2 crashes instead of failing gracefully.** `Exit handler never called!` is a known
   npm bug; on a fetch error it can throw an unhandled rejection and abort with exit 0. (Reportedly
   improved in npm ≥ 10.9 / 11.)

## Everything tried (all failed the same way, here)

| Attempt | Result |
|---|---|
| Plain `docker compose up --build` (parallel) | npm crash; also `npm error Exit handler never called!` under parallel load |
| Sequential per-service build | Same crash, single-threaded → not a memory/parallelism issue |
| Retry loop around `npm ci` (`&& exit 0`) | Useless — npm **exits 0** on the crash, so the loop "succeeds" with a broken tree |
| Content-checked retry (`rm -rf node_modules; check .bin/nest`) + BuildKit `--mount=type=cache,target=/root/.npm` | Did not converge (5+ attempts); cache didn't warm enough because the crash aborts before tarballs land |
| `--no-audit --no-fund` | Still crashed (a tarball fetch, not just audit, hangs) |
| `fetch-timeout=600000`, `fetch-retries=5`, `fetch-retry-maxtimeout=180000` via project `.npmrc` (copied before `npm ci`) | npm **waited the full 600 s** then still crashed → connection truly hung, not merely slow |
| `--network=host` | Same crash |
| `npm i -g npm@11` inside the container (to get the fixed npm) | The upgrade **itself** couldn't download — same registry stall |
| `docker compose build --no-cache <service>` (to bust poisoned cache) | Fresh `npm ci` → same crash |

## What IS confirmed working (so the code is not the problem)

- **Host build of each service succeeds** (`npm run build`), producing valid `dist/`.
- **Swagger generation works:** ran the host-built `auth` service against the dockerized Postgres →
  `GET :3101/api-docs-json` returned a valid OpenAPI 3 spec (11 paths, bearer scheme).
- **Gateway aggregation works:** ran `auth` (:3101) + `clinical` (:3104) + `gateway` (:3100, env
  pointing at them) → `GET :3100/openapi.json` merged **30 paths**, single server, global
  `bearerAuth`; `GET :3100/docs` served the Scalar page; the 7 not-running services were skipped
  gracefully by the gateway's try/catch.
- **The gateway image and all 6 frontend images DID rebuild** successfully (they don't hit a fresh
  backend `npm ci`, or their cache is intact).
- **Endpoint verification:** `scripts/smoke-e2e.sh` passes 83/83 against the running stack.

So the only missing piece is rebuilding the 9 backend images, which is blocked solely by the
VM↔registry network stalls + npm 10.8 crash behavior.

## Open questions / things to try (for Codex)

1. **Fix the Docker Desktop VM networking.** The host reaches the registry fine; the VM stalls.
   Candidates: Docker Desktop DNS settings, MTU issues in the VM (Cloudflare/registry over the
   gVisor/qemu net stack), VPN/firewall affecting only the VM, or restarting Docker Desktop / the
   VM. Is there a known Docker Desktop 29.x networking regression?

2. **Use npm ≥ 10.9 / 11 in the build** so a fetch failure errors cleanly (and doesn't poison the
   cache), with better retry behavior:
   - Bump base image to one that ships npm ≥ 10.9 (e.g. a newer `node:22`/`node:23-alpine`), or
   - `RUN corepack enable && corepack prepare npm@11 --activate` (corepack is bundled, may avoid the
     registry round-trip), or
   - `COPY` a pinned npm into the image.
   Caveat: if connections truly hang, even npm 11 may not *complete* — but it will fail loudly
   instead of silently producing a broken image, and won't poison the BuildKit cache.

3. **Pre-warm / vendor the dependencies so the build needs no (or minimal) registry access:**
   - BuildKit cache mount pre-populated from the host npm cache, or
   - `npm ci --offline` with the host `~/.npm` cache mounted/COPYed in (note: `bcrypt` in `auth`
     fetches a prebuilt binary via `prebuild-install` from GitHub at install time — a separate
     network call that may also stall), or
   - commit a verdaccio/local-registry mirror, or vendor `node_modules` per-platform.

4. **Bypass in-container install for the builder only.** `nest build` (tsc) does not load native
   binaries, so a linux `node_modules` isn't strictly required to *compile*; only the runtime
   (`deps`) stage needs a platform-correct tree (esp. `bcrypt` for `auth`). Could build TS with a
   host-provided `node_modules` and keep a minimal, reliable runtime install.

## How to reproduce the network symptom quickly

```bash
# Host — fast:
curl -s -o /dev/null -w '%{time_total}s http=%{http_code}\n' https://registry.npmjs.org/npm

# Inside the build VM — intermittently slow/hangs:
docker run --rm node:20-alpine sh -c \
  'apk add --no-cache curl >/dev/null 2>&1; \
   curl -sS -o /dev/null -w "total=%{time_total}s connect=%{time_connect}s http=%{http_code}\n" \
   --max-time 30 https://registry.npmjs.org/npm'

# Reproduce the crash directly (no Dockerfile needed):
docker run --rm \
  -v "$PWD/services/auth/package.json:/app/package.json:ro" \
  -v "$PWD/services/auth/package-lock.json:/app/package-lock.json:ro" \
  -w /app node:20-alpine sh -c 'npm ci --no-audit --no-fund; ls node_modules/.bin/nest || echo MISSING'
```

## Current state of the repo

- 9 services: `@nestjs/swagger` added to `dependencies` (+lockfiles), Swagger CLI plugin in
  `nest-cli.json`, `SwaggerModule` in `src/main.ts`. Gateway: aggregation in
  `src/proxy/proxy.middleware.ts` (`/openapi.json` + Scalar `/docs`, excluded from proxy).
- All 10 backends additionally have a `.npmrc` (resilience) + a one-line `COPY ... .npmrc` in their
  Dockerfile. **These were the resilience attempt; they can be reverted to pristine** if not wanted
  (`git checkout -- <service>/Dockerfile` and `rm <service>/.npmrc`).
- The running containers are still the **pre-Swagger images** (rebuild never succeeded), so
  `:3000/docs` is not live yet. It goes live on the first successful backend rebuild.
- New docs/scripts are untracked (`docs/`, `scripts/smoke-e2e.sh`); nothing committed.
