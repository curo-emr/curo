# syntax=docker/dockerfile:1
#
# One image definition for every NestJS backend. The build context is the repo
# root (the service needs packages/shared); pick the service with SERVICE:
#   docker build -f services/Dockerfile --build-arg SERVICE=auth .

ARG NODE_IMAGE=node:24-alpine
ARG NPM_REGISTRY=https://registry.npmjs.org/
ARG NPM_FLAGS="--no-audit --no-fund --fetch-timeout=120000 --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000"

# ── Stage 1: workspace manifests only, so installs stay cached until a package.json changes
FROM ${NODE_IMAGE} AS manifests
WORKDIR /app
COPY . .
RUN find . -type f ! -name package.json ! -name package-lock.json -delete \
    && find . -type d -empty -delete

# ── Stage 2: production dependencies of this service ─────────────────────────
FROM ${NODE_IMAGE} AS deps
ARG NPM_REGISTRY
ARG NPM_FLAGS
ARG SERVICE
# native modules (bcrypt) need build tools
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY --from=manifests /app ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspace services/${SERVICE} --registry="${NPM_REGISTRY}" ${NPM_FLAGS} \
    && cd services/${SERVICE} && node -e "require.resolve('@nestjs/core')"

# ── Stage 3: build @curo/shared, then the service ────────────────────────────
FROM ${NODE_IMAGE} AS builder
ARG NPM_REGISTRY
ARG NPM_FLAGS
ARG SERVICE
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY --from=manifests /app ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace packages/shared --workspace services/${SERVICE} --registry="${NPM_REGISTRY}" ${NPM_FLAGS} \
    && test -x node_modules/.bin/nest
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY services/${SERVICE} services/${SERVICE}
RUN npm run build --workspace packages/shared --workspace services/${SERVICE}

# ── Stage 4: production image ────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
ARG SERVICE
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app ./
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/services/${SERVICE}/dist services/${SERVICE}/dist
WORKDIR /app/services/${SERVICE}
CMD ["node", "dist/main"]
