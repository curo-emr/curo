# Document Upload & Viewing — Progress

Feature: doctors upload documents attached to a patient's visit (patient can view);
lab staff upload report files for the tests they perform.

## Architecture
- **New `curo-document-service`** (port 3009) — single owner of the `document_references`
  table (avoids the cross-service `synchronize` hazard since both doctors and labs write).
- **Object storage: MinIO** (S3-compatible) behind a `StorageProvider` interface
  (`put` / `getStream` / `getPresignedUrl` / `delete`). Swappable to SFTP/FS/S3 later with
  no API change. Bucket auto-created (lazily) on boot.
- **Upload = multipart/form-data** streamed through the gateway (gateway runs
  `bodyParser: false`, so raw bodies pass through). Bytes → MinIO, metadata → Postgres.
- **Access control**: patient reads resolve `patientId` from the JWT (`/documents/me`),
  never a query param. `/documents/:id/content` checks owner-patient OR staff before streaming.
- **Audit**: `CREATE` on upload, `READ` on view, via the embedded `AuditLog` entity
  (`resourceType: 'DocumentReference'`).

## API (via gateway `:3000`)
- `POST /documents` (multipart `file` + fields) — DOCTOR / LAB_STAFF / SUPER_ADMIN
- `GET /documents?patientId=&encounterId=` — staff list (metadata)
- `GET /documents/me` — patient's own documents (JWT identity)
- `GET /documents/:id/content` — stream bytes (access-checked)

## Checklist
- [x] Scaffold `curo-document-service` (NestJS, port 3009) — compiles (`npm run build`)
- [x] `DocumentReference` + `AuditLog` entities; `synchronize` creates `document_references`
- [x] `StorageProvider` interface + `MinioStorageProvider` (lazy bucket ensure)
- [x] DTO + service (upload/list/me/content, content-type allowlist, 20 MB cap, audit)
- [x] Controller (FileInterceptor, guards, roles, streaming download)
- [x] Gateway `SERVICE_MAP` → `/documents`
- [x] docker-compose: `minio` + `curo-document-service` + gateway env + depends_on + volume
- [x] Doctor portal: `FileInput`, `lib/api/documents.ts`, Documents tab + upload dialog + list
- [x] Lab portal: `FileInput`, `lib/api/documents.ts`, `LabReportUpload` in results flow
- [x] Patient portal: `lib/api/documents.ts`, visit-detail documents view (`/documents/me`)
- [x] All three frontends typecheck clean (`tsc --noEmit`)
- [x] **Service + storage verified live** (document-service + MinIO via docker compose, curl
  direct to `:3009`): upload → staff list → byte-exact content download (round-trips MinIO) →
  patient `/documents/me` → **403** for a different patient → **400** bad content-type →
  **401** unauthenticated → audit `CREATE` + `READ` rows present. Boot log shows bucket
  auto-created.
- [x] **Upload axios idiom verified**: the `Content-Type: undefined` override (so the browser
  sets the multipart boundary instead of the client's default `application/json`) was exercised
  against the running service via Node global `FormData` on the pinned **axios 1.16.1** → 201,
  file parsed. Same adapter-independent header logic the browser uses.
- [x] `npm ci` build of the service passes (lockfile committed; Dockerfile uses `npm ci`).
- [ ] Not run: full browser → gateway `:3000` path. Gateway `/documents` route is config-
  identical to the 19 existing routes (raw-body forwarding, `bodyParser: false`), so low risk;
  worth one manual portal upload before release.
- [ ] Commit per repo (root, curo-doctor, curo-lab, curo-patient)

## Notes / decisions
- No DB migrations in this project — schema via TypeORM `synchronize: true`. Single-owner rule
  keeps `document_references` exclusive to the document service.
- No sample document seeded: a DB row pointing at a non-existent MinIO object would be a broken
  link. Portals show their existing EmptyState until a real upload happens.
- Frontends are each their own git repo; backend lives in the root repo — commits are per-repo.
- Document viewing fetches bytes via the authenticated axios client (Bearer token is in
  localStorage, so a plain `<a href>` would 401) and opens an object URL.
