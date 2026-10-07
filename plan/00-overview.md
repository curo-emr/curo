# Curo EMR — Kafka Event Backbone + Nursing Officer Workstation

**Created:** 2026-07-03 · **Executor:** Claude Sonnet 5 · **Status:** not started

This plan folder contains three documents:

| Doc | Feature | Depends on |
|-----|---------|-----------|
| `01-kafka-event-backbone.md` | Kafka broker + event publishing from all domain services + notification/audit consumers | — |
| `02-nursing-officer.md` | Nurse triage (pre-visit vitals) + post-visit checklist + new `curo-nurse` frontend (port 3016) | Doc 01 (**hard** — see note) |
| `03-architecture-and-style-improvements.md` | Separately requested list of design/architecture/styling improvements found during codebase review. **Reference only — do not implement unless the user asks.** | — |

**Execution order:** Doc 01 fully, then Doc 02. Doc 01 is a **hard prerequisite**:
Doc 02 adds a third Kafka consumer — appointment-service consumes
`curo.clinical.events` to auto-advance the patient queue when the doctor starts
and finishes an encounter (Doc 02 §2.4). Nurse- and receptionist-driven stage
changes still go through HTTP and keep working if Kafka is down; in that degraded
mode only the automatic `with_doctor` / `awaiting_post_visit` moves stop
happening (cards stay in place — harmless, staff can still act, and the PUT
queue-stage endpoint accepts DOCTOR as a manual fallback).

---

## Locked decisions (confirmed with the user 2026-07-03)

1. **Kafka = event backbone, no new backend service.** A Kafka broker joins
   docker-compose; each domain service gets a small copied `src/kafka/` module
   (kafkajs producer) following the existing "copy, don't share npm package"
   convention. `curo-notification-service` and `curo-audit-service` become
   consumers (Doc 02 adds `curo-appointment-service` as a third, narrow consumer
   for queue automation). Synchronous reads/writes stay HTTP through the
   gateway. No event-sourcing, no command bus, no `curo-messaging-service`.
2. **Notification delivery stays polling** (existing 30 s `GET /notifications/count`
   polling in the Topbars). No WebSockets in this plan. Nurse/doctor queue screens
   poll their queue endpoints every 15 s.
3. **Nursing backend logic lives in existing services** — consistent with the
   settled, 3×-confirmed domain-driven decision (see `BUILD_PROGRESS.md`):
   - vitals + post-visit checklist → `curo-clinical-service` (they are clinical data)
   - patient queue stage → `curo-appointment-service` (it is scheduling state)
   - `NURSE` role → `curo-auth-service` + every service's enum copy
   - The only new top-level project is the **frontend** `apps/nurse/` (port 3016).
4. **Both nurse steps are optional.** Default flow routes checked-in patients to
   the nurse queue, but the receptionist can send a patient straight to the doctor,
   the doctor can start the encounter without nurse vitals, and a visit can finish
   without a post-visit checklist. No hard gating in backend transitions beyond
   the legal-transition map (Doc 02 §4.3).

## Cross-cutting rules (carry over from ADMIN_AND_ENHANCEMENTS_PLAN.md — they still apply)

- **Every slice leaves the stack bootable** via `docker compose up -d --build`
  with **no volume wipe**: all new columns nullable (+ backfilled where needed),
  new enum values appended (never removed/renamed), new tables created by
  TypeORM `synchronize`.
- **Entity copies must stay in sync.** Multiple services share tables via
  `synchronize: true`; a service holding a *stale* copy of an entity will DROP
  columns another service added (this has bitten twice — see slices 5 & 7 notes).
  Whenever you touch an entity, update **every copy**, including
  `packages/shared/src/entities/` (the canonical reference). Doc 02 lists every copy
  location for each entity it touches.
- Authorization enforced **server-side** from the JWT (`@Roles`, and ownership
  from `practitionerId`/`patientId` claims) — never from client-supplied params.
- Runtime deps go in `dependencies`, **never** devDependencies (Docker images use
  `npm ci --omit=dev`; the `qrcode` incident). This applies to `kafkajs`.
- Update `database/seed.ts` at the end of each slice; the seed must remain
  idempotent-ish (it short-circuits when data exists) and compile in the
  `curo-seed` container.
- Schema changes ship as a migration (`npm run db:generate -- migrations/<Name>`)
  committed with the entity change; services never alter the schema.
- Frontends: reuse the existing shadcn ui components and design tokens
  (`--status-*`, `--chart-*`, `bg-muted`, `text-muted-foreground`, …). No new
  component libraries. New pages must look native next to existing ones.
- The 6 frontends are **independent nested git repos** (gitlinks, no
  .gitmodules). `curo-nurse` must be created the same way: `git init` inside it,
  commit there, then commit the gitlink + backend changes in the parent repo.
- All touched TS projects must pass `npx tsc --noEmit` (backends) / `npm run build`
  (frontends) before a slice is checked off.
- Commit at the end of each phase/slice with a `feat(...)`/`chore(...)` message
  (see git log for style). **Phase 0 of Doc 01 creates a rollback checkpoint.**

## System facts you will need (verified 2026-07-03)

- **Ports:** gateway 3000; auth 3001; patient 3002; appointment 3003; clinical
  3004; pharmacy 3005; lab 3006; notification 3007; audit 3008; document 3009.
  Frontends: doctor 3010, patient 3011, receptionist 3012, lab 3013, pharmacy
  3014, admin 3015 → **nurse gets 3016**.
- **No service-to-service HTTP calls exist.** Cross-service side effects today are
  direct writes to shared tables via local entity copies (e.g. appointment-service
  writes `audit_logs`). The backend **never creates notifications** today; rows
  only come from seed or `POST /notifications`.
- JWT payload: `{ sub, email, role, practitionerId, patientId }`. Each service
  verifies the JWT itself in `src/common/jwt-auth.guard.ts` (the gateway checks it
  too, then forwards the request unchanged; it sets no `x-user-*` headers since 2026-10-07).
- Gateway routing is prefix-based in
  `services/api-gateway/src/proxy/proxy.middleware.ts` (`SERVICE_MAP`). New API
  prefixes must be added there and to the compose env of the gateway.
- FHIR style is "pragmatic FHIR-shaped": `resourceType` + core R4 fields; custom
  fields ride in `extension` with `urn:curo:*` urls. List endpoints return
  searchset Bundles via each service's `src/common/fhir-bundle.ts`.
- Frontend stack (identical across all 6): Next.js 16.1.6, React 19.2.3,
  Tailwind v4, shadcn (new-york), axios client with JWT refresh interceptor in
  `src/lib/api/client.ts`, sonner toasts, lucide icons, recharts.
- Seed credentials live in `docs/TEST_CREDENTIALS.md` + `BUILD_PROGRESS.md`.
- **Docker-build caveat:** on this dev box `npm ci` inside Docker may crash
  (npm 10.8 bug, see `docs/DOCKER_BUILD_ISSUE.md`). If `docker compose build`
  fails with `Exit handler never called!`, verify with host builds
  (`npm run build`, `tsc --noEmit`) + host-run services instead, and say so in
  the progress notes rather than retrying builds forever.

## Progress tracking

Each doc has its own checklist. Tick items **in the doc file itself** as you
complete them, and append a short "verified: …" note per slice, following the
pattern used in `ADMIN_AND_ENHANCEMENTS_PLAN.md`.
