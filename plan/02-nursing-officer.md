# Doc 02 — Nursing Officer: Triage Vitals + Post-Visit Checklist + `curo-nurse` Frontend

> **Implemented 2026-10-06 with a narrowed scope (user decision) — see `BUILD_PROGRESS.md` → "Nursing Officer".**
> - **Done:** NURSE role (N1), queue stages (N2), appointment-linked triage vitals (N3), doctor + receptionist
>   integration (N5), `curo-nurse` portal on 3016 (N6), seed + smoke tests (N7).
> - **Dropped:** the post-visit checklist (N4 and every checklist step/stage/UI below) — not needed.
> - **No Kafka:** Doc 01 was not implemented. Queue stages move over HTTP instead of the §2.4 consumer:
>   check-in (`arrived`) → `waiting_nurse`, `fulfilled` → `done`, cancel/no-show → cleared (appointment-service),
>   and the doctor portal sets `with_doctor` when it opens the visit. Stages: `waiting_nurse → with_nurse →
>   ready_for_doctor → with_doctor → done` (`ready_for_doctor → with_nurse` lets a nurse correct vitals).
> - Not built: the PATIENT_READY doctor notification (needed the Kafka consumer); the doctor schedule shows a
>   "Vitals ready" badge instead.

**Goal:** add a Nursing Officer role and workstation to the patient flow:

```
receptionist          nurse (NEW)              doctor                    nurse (NEW, optional)
 check-in     ──►  pre-visit triage:   ──►  encounter: sees nurse   ──►  post-visit checklist
 (arrived)         record vitals            vitals prefilled in          (health education,
                   (BP/HR/Temp/SpO2/         VitalsPanel, adjusts/        medication counseling, …)
                    Resp/Height/Weight)      adds, signs visit
```

Both nurse steps are **optional** (locked decision #4): receptionist can send a
patient straight to the doctor; a visit can complete without the post-visit
checklist.

**What already exists and is reused (do not rebuild):**
- Vitals are FHIR `Observation` rows with LOINC codes, created via clinical-service
  `POST /vitals` (`CreateVitalsDto`), rendered by the doctor in
  `apps/doctor/src/components/features/encounters/sections/VitalsPanel.tsx`
  (BP sys/dia, pulse, temp, SpO2, resp, height, weight + computed BMI).
- The doctor starts a visit from `ScheduleClient` →
  `/patients/:id/encounters/new?appointmentId=<id>` → `EncounterEditor`, which
  POSTs vitals per LOINC code via `VITALS_MAP` in `apps/doctor/src/lib/api/clinical.ts`
  when the visit is signed.
- Appointment status is FHIR (`booked/arrived/fulfilled/...`). We do NOT extend
  that enum (it's FHIR-constrained and enum migration is risky); queue position
  gets its own column (§4.1).

**Dependency on Doc 01: hard.** Beyond the "(Kafka)" publish points and
notification handlers, this doc makes appointment-service a **Kafka consumer**
(§2.4): it reacts to `encounter.started` / `encounter.completed` on
`curo.clinical.events` to auto-advance the queue when the doctor starts and
finishes a visit. Doc 01 (at least K1 + K2) must be complete first. Degraded
mode is acceptable: if Kafka is down, nurse/receptionist HTTP stage changes
still work and only the two automatic moves stop (cards sit in
`ready_for_doctor` / `with_doctor`; a DOCTOR or SUPER_ADMIN can move them
manually via the queue-stage endpoint).

---

## Slice N1 — NURSE role across the platform

### 1.1 Role enum

Add `NURSE = 'NURSE'` to `UserRole` in **every copy** (grep `PHARMACIST =` to
find them all; verified locations as of 2026-07-03):

- `packages/shared/src/enums/index.ts`
- `services/auth/src/enums/index.ts`
- `services/patient/src/enums/index.ts`
- `services/appointment/src/enums/index.ts`
- `services/clinical/src/enums/index.ts`
- `services/pharmacy/src/enums/index.ts`
- `services/lab/src/enums/index.ts`
- `services/notification/src/enums/index.ts`
- `scripts/seed.ts` (its local `UserRole` enum at the top)

(audit-service and document-service have no UserRole enum copy — nothing to do
there; re-run the grep anyway in case that changed.)

`users.role` / `practitioners` columns: check whether `role` is a Postgres enum
column or varchar in the User entity. If it's a TypeORM `enum` column, appending
a value is a safe ALTER; verify after boot that login with a NURSE user works.

### 1.2 Auth + admin

- `curo-auth-service`: `POST /auth/staff` and the AdminModule `POST /auth/users`
  must accept `NURSE` (they key off `dto.role !== UserRole.PATIENT` creating a
  practitioner — NURSE therefore gets a Practitioner row automatically; confirm
  and keep that behavior: nurses are practitioners with
  `specialty/qualification = 'Nursing'`).
- `curo-admin` frontend: add "Nurse" to the role options in the Add-User form
  and any role filter dropdowns/badges (grep `PHARMACIST` in `apps/admin/src`).

### 1.3 Seed

In `scripts/seed.ts`, following the receptionist pattern (~line 143):
- 2 nurses: `nimasha@curo.health` / `Nurse@123`, `ruwan@curo.health` / `Nurse@123`
  (User + Practitioner rows, role NURSE, active).
- Add them to `docs/TEST_CREDENTIALS.md` and the credential lists in
  `BUILD_PROGRESS.md`-style docs you touch.

### 1.4 Checklist — Slice N1

- [ ] `NURSE` added to every UserRole copy (list files touched in progress note)
- [ ] Admin user-creation (API + curo-admin UI) supports NURSE; creates practitioner row
- [ ] Seed: 2 nurse users + practitioners; docs updated with credentials
- [ ] Verify: create nurse via admin UI or seed, `POST /auth/login` returns JWT with `role: 'NURSE'` and a `practitionerId`
- [ ] All touched projects `tsc --noEmit` / build clean
- [ ] Commit: `feat(nurse 1): NURSE role + seed users`

*(Executor: append "Slice N1 verified: …" note here.)*

---

## Slice N2 — Queue stage on Appointment (appointment-service)

### 2.1 New column

`services/appointment/src/entities/appointment.entity.ts` **and**
`packages/shared/src/entities/appointment.entity.ts` (and any other service holding
an Appointment entity copy — grep `@Entity('appointments')`):

```ts
@Index()
@Column({ nullable: true })
queueStage: string | null; // QueueStage value; null = not in today's flow
```

Use a string column, NOT a Postgres enum (append-safety + copies-drift safety).
Define the values in `src/enums/index.ts` of appointment-service + curo-shared:

```ts
export enum QueueStage {
  WAITING_NURSE = 'waiting_nurse',       // checked in, in nurse queue (default after check-in)
  WITH_NURSE = 'with_nurse',             // nurse opened the triage form
  READY_FOR_DOCTOR = 'ready_for_doctor', // vitals done (or nurse skipped)
  WITH_DOCTOR = 'with_doctor',           // doctor started the encounter
  AWAITING_POST_VISIT = 'awaiting_post_visit', // doctor finished; in nurse post-visit queue
  WITH_NURSE_POST = 'with_nurse_post',   // nurse doing the checklist
  DONE = 'done',                         // flow complete for the day
}
```

### 2.2 Legal transitions (enforce server-side)

```ts
const QUEUE_TRANSITIONS: Record<string, QueueStage[]> = {
  [null-or-unset]:        [WAITING_NURSE, READY_FOR_DOCTOR, WITH_DOCTOR], // check-in (default nurse; bypass; doctor started with no check-in)
  waiting_nurse:          [WITH_NURSE, READY_FOR_DOCTOR, WITH_DOCTOR],    // nurse picks up | bypass | doctor started anyway (steps are optional)
  with_nurse:             [READY_FOR_DOCTOR, WAITING_NURSE, WITH_DOCTOR], // done | put back | doctor started anyway
  ready_for_doctor:       [WITH_DOCTOR],
  with_doctor:            [AWAITING_POST_VISIT, DONE],                    // doctor finished: post-visit nursing queue (default) or straight done
  awaiting_post_visit:    [WITH_NURSE_POST, DONE],                        // nurse picks up | skip
  with_nurse_post:        [DONE, AWAITING_POST_VISIT],                    // finish | put back
};
```

Reject illegal transitions with 400 (`BadRequestException` naming both stages).
Implement as a pure function `assertQueueTransition(current, next, actor)` where
`actor` is a role string or `'SYSTEM'` (used by the Kafka consumer, §2.4).
Role rules: RECEPTIONIST may set `waiting_nurse`/`ready_for_doctor` (check-in +
bypass); NURSE may set `with_nurse`/`ready_for_doctor`/`with_nurse_post`/`done`;
DOCTOR and SYSTEM may set `with_doctor`/`awaiting_post_visit`/`done` (the
`*→with_doctor` jumps from nurse stages are DOCTOR/SYSTEM/SUPER_ADMIN only —
they exist because both nurse steps are optional); SUPER_ADMIN anything.

### 2.3 Endpoints (appointment-service)

1. `PUT /appointments/:id/queue-stage` — body `{ stage: QueueStage }`, roles
   `NURSE, RECEPTIONIST, DOCTOR, SUPER_ADMIN`. Validates transition + role,
   saves, publishes (Kafka) `appointment.queue-stage-changed`
   `{ appointmentId, patientId, practitionerId, previousStage, newStage }`.
2. `GET /appointments/nurse-queue?date=YYYY-MM-DD&stage=pre|post` — role
   `NURSE, SUPER_ADMIN`. Returns that day's appointments where:
   - `stage=pre` (default): `queueStage IN (waiting_nurse, with_nurse)`
   - `stage=post`: `queueStage IN (awaiting_post_visit, with_nurse_post)`
   Ordered by `start` ASC. FHIR searchset Bundle (reuse `toSearchset` +
   `toFhirAppointment`). Nurses see **all doctors' patients** (single shared
   nurse station) — no practitioner filter.
3. Existing `PUT /appointments/:id` check-in path: when status is set to
   `arrived` and `queueStage` is null, also set `queueStage = waiting_nurse`
   (keeps old clients working). Grant `NURSE` read access on
   `GET /appointments` and `GET /appointments/:id` (@Roles additions).

### 2.4 FHIR mapper + event-driven queue automation

- `toFhirAppointment`: add extension `{ url: 'urn:curo:queueStage', valueString: a.queueStage }`
  (filter out when null, same pattern as `cancelledReason`).
- **Encounter start/finish moves the queue via Kafka.** Clinical-service owns
  encounters and must not write the appointments table (single-owner rule); the
  doctor frontend should not have to orchestrate queue state either. Instead,
  **appointment-service becomes a Kafka consumer**:
  - New `src/kafka/kafka-consumer.service.ts` in appointment-service — reuse
    the consumer skeleton defined in Doc 01 §4.2, consumer group
    **`curo-appointment`**, subscribed to **`curo.clinical.events` only**
    (`fromBeginning: false`).
  - Handlers (ignore all other eventTypes):
    - `encounter.started` → if `payload.appointmentId` present, set that
      appointment's `queueStage = with_doctor`
    - `encounter.completed` → if `payload.appointmentId` present, set
      `queueStage = awaiting_post_visit`
  - Both go through the same internal update path as the HTTP endpoint with
    `actor = 'SYSTEM'` (so `assertQueueTransition` runs and
    `appointment.queue-stage-changed` is still published — no loop risk:
    this consumer reads clinical events and writes appointment events only).
  - **Idempotent + tolerant:** setting a stage the row already has is a silent
    no-op (at-least-once redelivery safe); a missing appointment or an illegal
    transition (e.g. encounter completed twice, or stage already `done`) is
    logged at debug and skipped — never thrown.
  - **No DLQ for this consumer** (deliberate deviation from Doc 01's pattern):
    a lost queue nudge is harmless, self-correcting, and carries no data. On
    handler error: log + skip. Do not add a `curo.appointment.dlq` topic.
  - Requires `encounter.started`/`encounter.completed` payloads to include
    `appointmentId` — Doc 01 §3.3 already specifies this; when implementing
    `updateEncounterStatus`, remember the encounter row (already loaded for the
    update) carries the `appointmentId` to put in the payload.

### 2.5 Backfill

None needed — column is nullable and only today's flow uses it. Old
appointments stay null. Seed (§N6) sets stages for today's demo appointments.

### 2.6 Checklist — Slice N2

- [ ] `queueStage` column on every Appointment entity copy (+ curo-shared); `QueueStage` enum
- [ ] Transition map + role rules as pure function `assertQueueTransition(current, next, actor)` incl. `'SYSTEM'` actor
- [ ] `PUT /appointments/:id/queue-stage` + `GET /appointments/nurse-queue`
- [ ] Check-in path auto-sets `waiting_nurse`; NURSE granted read roles
- [ ] FHIR extension `urn:curo:queueStage` in mapper
- [ ] `appointment.queue-stage-changed` published on every stage change (HTTP and consumer paths)
- [ ] Kafka consumer in appointment-service (group `curo-appointment`, `curo.clinical.events` only): `encounter.started` → `with_doctor`, `encounter.completed` → `awaiting_post_visit`; idempotent, log-and-skip errors, no DLQ
- [ ] `tsc --noEmit` clean; verify via curl: check-in → nurse-queue lists it → illegal transition → 400
- [ ] Consumer verify: set an appointment to `ready_for_doctor`, POST an encounter with that `appointmentId` (as doctor) → within ~2 s the appointment's queueStage is `with_doctor`; complete the encounter → `awaiting_post_visit`; replay the completed event (console producer) → no change, no error spam
- [ ] Commit: `feat(nurse 2): appointment queue stages + event-driven queue automation`

*(Executor: append "Slice N2 verified: …" note here.)*

---

## Slice N3 — Nurse vitals (clinical-service)

### 3.1 Observation changes

Add to `Observation` entity — **every copy**: clinical-service, patient-service,
lab-service, curo-shared (grep `@Entity('observations')`; stale copies drop
columns!):

```ts
@Index()
@Column({ nullable: true })
appointmentId: string | null;   // links pre-encounter triage vitals to the visit

@Column({ nullable: true })
performerRole: string | null;   // 'NURSE' | 'DOCTOR' — display "recorded by"
```

### 3.2 API changes (clinical-service)

- `CreateVitalsDto`: add optional `appointmentId?: string`.
- `POST /vitals`: add `NURSE` to `@Roles`; `addVitals` stores `appointmentId`
  and `performerRole` (from `user.role`). Existing doctor calls keep working
  (fields nullable).
- `GET /vitals` accepts `?appointmentId=` (in addition to `?patientId=`);
  `NURSE` added to read roles on `GET /vitals*` routes. Response objects (FHIR
  Observation) gain `extension` entries `urn:curo:appointmentId`,
  `urn:curo:performerRole` and `performer` display when practitioner known.
- **Auto-link on encounter creation:** in `createEncounter`, when
  `dto.appointmentId` is present, after saving the encounter run:
  `UPDATE observations SET "encounterId" = :encId WHERE "appointmentId" = :apptId AND "encounterId" IS NULL`
  (repository `update` call). Nurse vitals thereby become part of the encounter
  record without re-posting.
- (Kafka) `vitals.recorded` payload gains `appointmentId` + `performerRole`
  (already specified in Doc 01 §3.3).
- NURSE also needs patient context to triage safely — patient-service:
  add `NURSE` to `@Roles` on `GET /patients`, `GET /patients/:id`,
  `GET /patients/:id/allergies`, `GET /patients/:id/conditions`, vitals-trend
  routes. Projection: give NURSE the **full clinical projection** (same as
  DOCTOR) in `toFhirPatient(patient, role)` — nurses need allergies/conditions;
  they are clinical staff. Do NOT give them the pharmacy/lab minimized shape.

### 3.3 Doctor-side dedupe rule (implemented in Slice N5, decided here)

When the doctor signs the visit, `EncounterEditor` must NOT re-post vitals the
nurse already recorded and the doctor left unchanged. Rule: prefilled values are
tracked; on sign, post only fields that are (a) newly filled or (b) changed from
the prefill. Changed values create a NEW observation (the nurse's original row
stays — clinically correct: two measurements at two times).

### 3.4 Checklist — Slice N3

- [ ] `appointmentId` + `performerRole` on every Observation entity copy (+ curo-shared)
- [ ] DTO + `POST /vitals` accepts NURSE + appointmentId; performerRole stored
- [ ] `GET /vitals?appointmentId=` filter + NURSE read roles + new extensions in FHIR mapper
- [ ] Encounter creation auto-links appointment observations (encounterId backfill UPDATE)
- [ ] patient-service NURSE roles + full clinical projection
- [ ] (Kafka) vitals.recorded payload updated
- [ ] `tsc --noEmit` clean; curl verify: POST vitals as nurse with appointmentId → GET /vitals?appointmentId returns them → create encounter with that appointmentId → observations now carry encounterId
- [ ] Commit: `feat(nurse 3): triage vitals — appointment-linked observations`

*(Executor: append "Slice N3 verified: …" note here.)*

---

## Slice N4 — Post-visit checklist (clinical-service)

### 4.1 New entity

`services/clinical/src/entities/post-visit-checklist.entity.ts` (+ copy to
`packages/shared/src/entities/`; register in clinical `app.module.ts` entities and
export from shared index):

```ts
@Entity('post_visit_checklists')
export class PostVisitChecklist {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column() appointmentId: string;
  @Index() @Column() patientId: string;
  @Column({ nullable: true }) encounterId: string;
  @Column() nurseId: string;                    // practitionerId of the nurse
  @Column({ type: 'jsonb' }) items: { code: string; label: string; checked: boolean; note?: string }[];
  @Column({ type: 'text', nullable: true }) notes: string;
  @Column({ type: 'timestamptz' }) completedAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

One checklist per appointment (add a unique index on `appointmentId`; handle
conflict as 409 "checklist already recorded").

### 4.2 Checklist item catalog

Constant in clinical-service (`src/nursing/checklist-catalog.ts`) — the frontend
keeps its own copy (static-catalog convention, like ICD/medications JSON):

```ts
export const POST_VISIT_CHECKLIST_ITEMS = [
  { code: 'health_education',        label: 'Health education provided' },
  { code: 'medication_counseling',   label: 'Medication use explained' },
  { code: 'next_appointment_advised',label: 'Follow-up / next appointment advised' },
  { code: 'lab_instructions',        label: 'Lab sample / fasting instructions given' },
  { code: 'vaccination_administered',label: 'Vaccination administered' },
  { code: 'dressing_wound_care',     label: 'Dressing / wound care done' },
  { code: 'dietary_advice',          label: 'Dietary advice given' },
  { code: 'vitals_recheck',          label: 'Vitals re-checked before discharge' },
] as const;
```

### 4.3 Module + endpoints

New `src/nursing/` module in clinical-service (nursing.module.ts, controller,
service, `dto/create-checklist.dto.ts`) — registered in app.module. Routes:

- `POST /nursing/checklists` — roles `NURSE, SUPER_ADMIN`. Body:
  `{ appointmentId, patientId, encounterId?, items: [{code, checked, note?}], notes? }`.
  Server merges labels from the catalog (reject unknown codes, 400), sets
  `nurseId` from JWT `practitionerId`, `completedAt = now`. Publishes (Kafka)
  `post-visit-checklist.completed` `{ checklistId, appointmentId, patientId, nurseId, checkedCodes }`.
- `GET /nursing/checklists?appointmentId=|patientId=` — roles
  `NURSE, DOCTOR, SUPER_ADMIN`.
- Response shape: pragmatic-FHIR — there is no perfect R4 resource for this;
  return it as a `Task`-shaped resource? **No — keep it a plain
  `resourceType: 'CuroPostVisitChecklist'` custom resource** with the entity
  fields; simpler and consistent with the "extensions for custom data" spirit.

### 4.4 Gateway

`services/api-gateway/src/proxy/proxy.middleware.ts` `SERVICE_MAP`: add
`'/nursing': CLINICAL_SERVICE_URL`. No compose change needed (env already
exists for clinical URL).

### 4.5 Checklist — Slice N4

- [ ] Entity (+ shared copy) with unique appointmentId index; registered in TypeORM
- [ ] Catalog constant; POST validates codes against it
- [ ] `POST /nursing/checklists` + `GET /nursing/checklists` with roles as specified
- [ ] Gateway `/nursing` route
- [ ] (Kafka) `post-visit-checklist.completed` published
- [ ] `tsc --noEmit`; curl verify: create as nurse → 201, duplicate → 409, unknown code → 400, GET by appointmentId as doctor → row
- [ ] Commit: `feat(nurse 4): post-visit checklist API`

*(Executor: append "Slice N4 verified: …" note here.)*

---

## Slice N5 — Doctor + receptionist frontend integration

### 5.1 curo-doctor

1. **API layer** (`src/lib/api/clinical.ts` / `encounters.ts` /
   `appointments.ts`): add `getVitalsByAppointment(appointmentId)` and
   `getChecklist(appointmentId)`. Extend the appointment mapper (`mappers.ts`)
   to read the `urn:curo:queueStage` extension into `appointment.queueStage`.
   (No queue-stage mutation helper in the doctor FE — the queue advances via
   the appointment-service Kafka consumer, §2.4.)
2. **ScheduleClient** (`src/app/(dashboard)/schedule/ScheduleClient.tsx`): on
   each appointment card, when `queueStage === 'ready_for_doctor'`, show a
   Badge "Vitals recorded" using the existing success status tokens
   (`bg-status-success-bg text-status-success-text`); when `waiting_nurse` /
   `with_nurse`, show "With nurse" using warning tokens. Reuse the existing
   `Badge` component — match how status badges are already rendered in that file.
3. **EncounterEditor** (`src/components/features/encounters/EncounterEditor.tsx`):
   - On mount (when `appointmentId` present): fetch nurse vitals; map LOINC
     codes back to `Vitals` keys via the existing `VITALS_MAP` (invert it);
     `setVitals(prefill)`; keep the prefill snapshot in a ref.
   - Pass a new optional prop to `VitalsPanel`:
     `prefillMeta?: { recordedBy: string; recordedAt: string }` → renders a
     subtle banner row inside the card:
     `<UserCheck/> Recorded by {nurse name} at {HH:mm}` styled
     `text-xs text-muted-foreground` with a "Nurse" Badge. (Nurse display name:
     resolve from `getPractitioners()` which the doctor FE already loads for
     dropdowns; fall back to "Nursing staff".)
   - `handleFinishVisit` step 3: filter `vitalPayloads` to changed/new fields
     only (compare against prefill snapshot, §N3.3).
   - No queue-stage calls here: creating the encounter publishes
     `encounter.started` and signing publishes `encounter.completed`, and the
     appointment-service consumer moves the stage (§2.4). Just make sure
     `createEncounter` is always called **with `appointmentId`** when the visit
     came from the schedule (it already is — `?appointmentId=` query param).
4. Encounter detail page (`patients/[patientId]/encounters/[encounterId]/page.tsx`):
   where vitals render, show `performerRole === 'NURSE'` marker; if a checklist
   exists for the appointment, render a read-only "Post-visit care" card
   (checked items list). Reuse `SectionCard`/`Card` components.

### 5.2 (Kafka) notification handlers — finish the Doc 01 stubs

In the notification consumer:

| Event | Recipient | Type | Message |
|---|---|---|---|
| `appointment.queue-stage-changed` → `ready_for_doctor` | the appointment's practitioner | PATIENT_READY | "Patient ready: vitals recorded" |
| `vitals.recorded` with `performerRole==='NURSE'` | (covered by the queue-stage event — DO NOT also notify per observation; 8 vitals = 8 events. Implement as no-op with a comment.) | — | — |
| `post-visit-checklist.completed` | none (visible in UI) — no-op handler with comment | — | — |

### 5.3 curo-receptionist

1. Check-in action (`src/lib/actions/checkin-actions.ts`): `checkInPatient`
   keeps setting `arrived` (backend now auto-sets `waiting_nurse`). Add
   `sendDirectlyToDoctor(appointmentId)` → check-in + `queue-stage` to
   `ready_for_doctor` (the bypass).
2. **QueueBoard** (`src/components/features/queue/QueueBoard.tsx`) — rework the
   columns to queueStage (this also fixes its current mock-era statuses, see
   Doc 03 item 1): columns **Waiting for Nurse → With Nurse → Ready for Doctor →
   With Doctor → Post-visit → Done**, driven by the mapped `queueStage`. Wire
   data from the real API (`GET /appointments?date=today` + mapper reading the
   extension) instead of the stale `visits`/`checkInTime` props. "Send to
   Doctor" button (bypass) appears only on `waiting_nurse` cards; wait-time
   badge can use `appointment.start` as the reference time. Keep the existing
   card/badge/token styling — this is a rewire, not a redesign. Add a 15 s
   `setInterval` refetch (replace the manual refresh-only behavior).
3. Mapper: read `urn:curo:queueStage` into the frontend type; add `queueStage`
   to `Appointment` type; retire uses of `visitId`/`checkInTime` in the board.

### 5.4 Checklist — Slice N5

- [ ] doctor: api helpers + mapper queueStage
- [ ] doctor: schedule badges (Vitals recorded / With nurse)
- [ ] doctor: EncounterEditor prefill + recorded-by banner + changed-only vitals posting
- [ ] verify from the UI: doctor starts a visit → appointment card moves to "With Doctor" on the receptionist QueueBoard within one poll cycle (event-driven, §2.4); sign & finish → "Post-visit"
- [ ] doctor: encounter detail shows performerRole + post-visit card
- [ ] (Kafka) PATIENT_READY handler; explicit no-op handlers for vitals.recorded / checklist.completed
- [ ] receptionist: bypass action + QueueBoard rewired to queueStage with 15 s polling
- [ ] Both frontends `npm run build` clean
- [ ] Commit: `feat(nurse 5): doctor + receptionist queue/vitals integration` (remember: doctor/receptionist are nested repos — commit inside each, then the parent)

*(Executor: append "Slice N5 verified: …" note here.)*

---

## Slice N6 — `curo-nurse` frontend (port 3016)

### 6.1 Scaffold

Create by **copying `apps/receptionist/`** (closest feature shape: queue-centric,
same Topbar/Sidebar/Auth patterns) — NOT a fresh create-next-app (keeps design
tokens, ui components, client.ts, Dockerfile, eslint config identical):

```bash
rsync -a --exclude node_modules --exclude .next --exclude .git apps/receptionist/ apps/nurse/
cd apps/nurse && git init && npm install
```

Then rename/trim:
- `package.json`: name `nurse-portal`, dev script port **3016**.
- Delete receptionist-only features: patients registration form, appointments
  booking, income, reports, schedule pages + their `lib/actions`; keep
  `components/ui/*`, `lib/api/client.ts` (JWT+refresh interceptor), `mappers`,
  `AuthContext`, layout components (Sidebar/Topbar), globals.css **unchanged**.
- Role gate on `role === 'NURSE'`: mirror curo-admin's pattern in
  `apps/admin/src/components/layout/ProtectedRoute.tsx` (that's where the
  SUPER_ADMIN gate lives — not in AuthContext).
- Sidebar nav items: Dashboard, Triage Queue, Post-Visit, Settings.
- Update branding strings ("Nurse Station"); keep the same logo/wordmark
  components; do not invent a new color scheme — same tokens.

### 6.2 Pages & components

All data via gateway `http://localhost:3000`; every list polls every 15 s
(reuse the Topbar's existing 30 s notification polling as the reference
pattern; simple `setInterval` in `useEffect`, cleared on unmount).

1. **`/dashboard`** — stat cards (reuse the receptionist dashboard card
   pattern): patients waiting (pre), with nurse now, seen today (count of
   vitals recorded today by this nurse — derive client-side from queue data;
   don't build a new endpoint), post-visit pending. Below: compact "next in
   queue" list (first 5 of pre queue) with "Start triage" buttons.
2. **`/queue` (Triage Queue)** — `GET /appointments/nurse-queue?stage=pre`.
   Card list (reuse QueueBoard card styling): patient name, PHN, doctor name
   (practitioners lookup), appointment time, wait badge, stage badge. Buttons:
   - `waiting_nurse` card → **Start Triage** → `PUT queue-stage with_nurse` →
     navigate `/triage/[appointmentId]`
   - `with_nurse` card → **Resume**
   - overflow menu → **Skip to doctor** (`ready_for_doctor`)
3. **`/triage/[appointmentId]`** — the core screen. Layout mirrors
   EncounterEditor's grid (main column + right rail):
   - Header: patient name, PHN, age/gender, appointment time + doctor, back link.
   - **Allergies + chronic conditions banner** (from
     `GET /patients/:id/allergies|conditions`): red/amber Badge chips — safety
     context, read-only.
   - **Vitals form**: reuse the exact `VITAL_FIELDS` grid + BMI computation
     from doctor's `VitalsPanel.tsx` (copy the component into
     `src/components/features/triage/TriageVitalsPanel.tsx`; same
     inputs/labels/units/BMI badge). **No free-text nurse-notes field in v1**
     (there is no clean Observation code for it; post-visit checklist has a
     notes field which covers the need).
   - Previous vitals reference: last recorded vitals for the patient
     (`GET /vitals/patient/:id`, latest per code) shown as muted text under
     each input ("last: 128 mmHg").
   - Actions: **Save vitals & mark ready** → POST one observation per filled
     field (copy the `VITALS_MAP` + posting loop pattern from doctor's
     `handleFinishVisit` step 3, including `appointmentId`) → `PUT queue-stage
     ready_for_doctor` → toast → back to `/queue`. Secondary: **Back to queue**
     (stage back to `waiting_nurse`).
4. **`/post-visit`** — `GET /appointments/nurse-queue?stage=post`. Same card
   list; **Start checklist** → `with_nurse_post` → `/post-visit/[appointmentId]`.
5. **`/post-visit/[appointmentId]`** — patient header (as triage) + checklist
   form: one row per catalog item — `Checkbox` + label + optional note Input
   (revealed when checked); overall notes Textarea; **Complete visit** →
   `POST /nursing/checklists` → `PUT queue-stage done` → toast → back.
   Also show (read-only) what the doctor did this visit if available:
   prescriptions + lab orders for the encounter (nice-to-have; skip if the
   lookup would need new endpoints — `GET /prescriptions?patientId=` and
   `GET /lab-orders?patientId=` exist and NURSE needs `@Roles` additions there;
   grant NURSE read on those two clinical GET routes if you implement this,
   otherwise leave it out and note it).
6. **`/settings`** — keep the copied settings page (profile/logout) as-is.

### 6.3 API modules

`src/lib/api/nursing.ts`: `getNurseQueue(stage)`, `updateQueueStage`,
`postVitals` (per-code helper mirroring doctor's `clinical.ts` `VITALS_MAP` —
copy that constant), `getVitalsByAppointment`, `createChecklist`,
`getChecklist`. Keep the checklist catalog constant in
`src/lib/constants.ts` (copy of the backend catalog).

### 6.4 Wiring into the platform

- Nested git repo: `git init`, initial commit inside `apps/nurse/`, then parent
  repo records the gitlink (matches the other 6 frontends).
- `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3000`.
- docker-compose: `curo-nurse` service on 3016 (copy the `curo-receptionist`
  block; build arg NEXT_PUBLIC_API_URL, HOSTNAME 0.0.0.0, depends_on gateway).
- Gateway CORS: add `http://localhost:3016` to `FRONTEND_ORIGINS` in compose
  **and** to the gateway's default-origins fallback in code (grep `3015` in
  `services/api-gateway/src` to find where origins default).
- Topbar notification polling works as-is (nurse users get notifications like
  any user).

### 6.5 Checklist — Slice N6

- [ ] Scaffold copied from receptionist, trimmed, renamed, port 3016, NURSE-gated login
- [ ] Dashboard page with live queue stats
- [ ] Triage queue page (poll 15 s) with Start/Resume/Skip actions
- [ ] Triage page: allergy/condition banner, vitals grid + BMI, last-vitals hints, save→ready flow
- [ ] Post-visit queue + checklist form → POST checklist → stage done
- [ ] `src/lib/api/nursing.ts` + catalog constant
- [ ] compose service (3016) + gateway origins (env + code default)
- [ ] `npm run build` clean; nested git repo initialized + committed; parent gitlink committed
- [ ] Commit: `feat(nurse 6): curo-nurse frontend (port 3016)`

*(Executor: append "Slice N6 verified: …" note here.)*

---

## Slice N7 — Seed + end-to-end verification

### 7.1 Seed additions (`scripts/seed.ts`)

- 2 nurses (from N1).
- For today's seeded appointments: set a spread of queue stages —
  2× `waiting_nurse` (booked+arrived), 1× `ready_for_doctor` **with 4-6 nurse
  vitals observations** (appointmentId set, performerRole NURSE, realistic
  values incl. one hypertensive BP), 1× `awaiting_post_visit` (with a completed
  encounter), 1× `done` **with a post_visit_checklists row** (3-4 items checked).
- Keep the seed short-circuit behavior intact (it must remain safe to run on an
  existing volume).

### 7.2 End-to-end scenario (manual, through the UIs)

Walk the full loop and record the outcome in the progress note:

1. Receptionist (3012): check in a booked patient → patient appears on nurse
   queue (3016) within 15 s.
2. Nurse: Start Triage → allergies visible → enter vitals (make BP 150/95) →
   Save & mark ready.
3. Doctor (3010): schedule shows "Vitals recorded" badge; notification bell
   increments with "Patient ready". Start visit → VitalsPanel prefilled with
   nurse values + "Recorded by" banner + BMI computed; receptionist QueueBoard
   card auto-moves to "With Doctor" (Kafka consumer) within a poll cycle.
   Change weight only; add prescription; Sign & Finish → card auto-moves to
   "Post-visit".
4. DB check: the visit's observations — nurse rows have `performerRole='NURSE'`
   and now an `encounterId`; exactly ONE new doctor observation (weight).
5. Nurse: patient now in Post-Visit queue → complete checklist (health
   education + medication counseling) → Done.
6. Doctor: encounter detail shows the post-visit card. Admin (3015): audit log
   shows the queue-stage/vitals/checklist events (Kafka path).
7. Bypass path: check in another patient → receptionist "Send directly to
   doctor" → appears `ready_for_doctor` without vitals; doctor starts visit
   with empty VitalsPanel (no banner) — everything still works.

### 7.3 Checklist — Slice N7

- [ ] Seed: nurses, staged appointments, nurse vitals, checklist row; compiles in seed container context (`docker compose build curo-seed` or host ts-node run)
- [ ] Scenario steps 1–7 all pass (note any deviations)
- [ ] Full boot: `docker compose up -d --build` (or documented host-run fallback) — all containers healthy incl. curo-nurse, no synchronize column drops in logs
- [ ] Docs: update `docs/TEST_CREDENTIALS.md`, append a "Nursing officer" section to `BUILD_PROGRESS.md`
- [ ] Final commits (nested repos first, then parent): `feat(nurse 7): seed + e2e verification`

*(Executor: append "Slice N7 verified: …" note here.)*
