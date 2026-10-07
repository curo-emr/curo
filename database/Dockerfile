# syntax=docker/dockerfile:1
# One-shot image for database tooling. Compose runs it twice:
#   curo-migrate: npm run db:migrate   (before the backends start)
#   curo-seed:    npm run seed         (dev data, after migrations)
FROM node:22-alpine
# native modules (bcrypt) need build tools
RUN apk add --no-cache python3 make g++
WORKDIR /app
# root-level deps only (typeorm, pg, ts-node, bcrypt, ...); the workspaces aren't needed
COPY package*.json ./
RUN npm ci --no-workspaces --no-audit --no-fund
COPY tsconfig.base.json ./
COPY database/ ./database/
# the seed imports the patient identifier generators from source
COPY packages/shared/src/identifiers/ ./packages/shared/src/identifiers/
COPY packages/shared/src/lab/ ./packages/shared/src/lab/
CMD ["npm", "run", "db:migrate"]
