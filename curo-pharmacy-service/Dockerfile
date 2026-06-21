# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:22-alpine
ARG NPM_REGISTRY=https://registry.npmjs.org/

# ── Stage 1: install production dependencies ──────────────────────────────────
FROM ${NODE_IMAGE} AS deps
ARG NPM_REGISTRY
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --registry="${NPM_REGISTRY}" --no-audit --no-fund --fetch-timeout=120000 --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 \
    && node -e "require.resolve('@nestjs/core')"

# ── Stage 2: build TypeScript ─────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS builder
ARG NPM_REGISTRY
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --registry="${NPM_REGISTRY}" --no-audit --no-fund --fetch-timeout=120000 --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 \
    && test -x node_modules/.bin/nest
COPY . .
RUN npm run build

# ── Stage 3: production image ─────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3005
CMD ["node", "dist/main"]
