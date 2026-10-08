# syntax=docker/dockerfile:1
#
# One image definition for every Next.js portal. The build context is the repo
# root: portals are npm workspaces and compile @curo/web from source. Pick the
# portal with APP:
#   docker build -f apps/Dockerfile --build-arg APP=doctor .
# The listening port comes from PORT at runtime (set per portal in docker-compose.yml).

ARG NODE_IMAGE=node:24-alpine
ARG NPM_REGISTRY=https://registry.npmjs.org/
ARG NPM_FLAGS="--no-audit --no-fund --fetch-timeout=120000 --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000"

# ── Stage 1: workspace manifests only, so installs stay cached until a package.json changes
FROM ${NODE_IMAGE} AS manifests
WORKDIR /app
COPY . .
RUN find . -type f ! -name package.json ! -name package-lock.json -delete \
    && find . -type d -empty -delete

# ── Stage 2: install this portal's dependencies, then build it ────────────────
FROM ${NODE_IMAGE} AS builder
ARG NPM_REGISTRY
ARG NPM_FLAGS
ARG APP
WORKDIR /app
COPY --from=manifests /app ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace apps/${APP} --registry="${NPM_REGISTRY}" ${NPM_FLAGS} \
    && test -x node_modules/.bin/next
COPY packages/web packages/web
COPY apps/${APP} apps/${APP}
# NEXT_PUBLIC_* vars are inlined at build time
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace apps/${APP}

# ── Stage 3: production image ─────────────────────────────────────────────────
# The standalone output is traced from the repo root (where the lockfile is), so
# the server sits at apps/<APP>/server.js and needs no further node_modules.
FROM ${NODE_IMAGE} AS runner
ARG APP
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder /app/apps/${APP}/.next/standalone ./
COPY --from=builder /app/apps/${APP}/.next/static apps/${APP}/.next/static
COPY --from=builder /app/apps/${APP}/public apps/${APP}/public
WORKDIR /app/apps/${APP}
CMD ["node", "server.js"]
