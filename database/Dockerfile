# syntax=docker/dockerfile:1
# One-shot image for database tooling. Compose runs it three ways:
#   curo-migrate:      npm run db:migrate    (before the backends start)
#   curo-icd10-import: npm run icd10:import  (the diagnosis list, after migrations)
#   curo-seed:         npm run seed          (dev data, after migrations)

# CMS's yearly ICD-10-CM release, checked against the hash it was reviewed at.
# A new release: change these three, rebuild, and run curo-icd10-import.
FROM node:24-alpine AS icd10cm
ARG ICD10CM_URL=https://www.cms.gov/files/zip/2027-code-descriptions-tabular-order.zip
ARG ICD10CM_SHA256=91c6c9d1117764ce72375a0f3a5493b1725dafbc1ab283b55799076c9e194965
ARG ICD10CM_CODES_FILE="Code Descriptions/icd10cm_codes_2027.txt"
RUN wget -q -O /tmp/release.zip "$ICD10CM_URL" \
 && echo "$ICD10CM_SHA256  /tmp/release.zip" | sha256sum -c - \
 && unzip -p /tmp/release.zip "$ICD10CM_CODES_FILE" > /icd10cm-codes.txt \
 && test -s /icd10cm-codes.txt

FROM node:24-alpine
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
# and sets today's appointments on the clinic's clock
COPY packages/shared/src/config/ ./packages/shared/src/config/
# the ICD-10-CM import checks codes with the same rule as the API
COPY packages/shared/src/icd10/ ./packages/shared/src/icd10/
COPY --from=icd10cm /icd10cm-codes.txt ./database/data/icd10cm-codes.txt
CMD ["npm", "run", "db:migrate"]
