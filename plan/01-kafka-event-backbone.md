# Doc 01 — Kafka Event Backbone

**Goal:** introduce Apache Kafka as the asynchronous event backbone of Curo.
Domain services **publish** domain events; `curo-notification-service` and
`curo-audit-service` **consume** them to create notification rows and audit
rows. This replaces "nothing happens" (notifications were never created by any
backend flow) and complements the existing direct audit writes.

**Non-goals (explicitly out of scope):**
- No WebSocket push (frontends keep polling).
- No event sourcing / CQRS / command topics — Kafka carries *facts that already
  happened*, HTTP stays the request path.
- No schema registry / Avro — JSON envelopes with a `version` field.
- No transactional outbox (listed in Doc 03 as a future improvement). Publishing
  is fire-and-forget after the DB write; a lost event only means a missed
  notification, never lost domain data.
- No removal of the existing direct audit writes (admin/payment flows keep them;
  they capture before/after diffs the events don't).

---

## 1. Architecture

```
                    ┌────────────────────────────── Kafka (KRaft, single broker) ─┐
                    │  curo.patient.events        curo.appointment.events         │
                    │  curo.clinical.events       curo.pharmacy.events            │
                    │  curo.lab.events            curo.document.events            │
                    │  curo.notifications.dlq     curo.audit.dlq                  │
                    └──────▲───────────▲──────────────────┬──────────────┬────────┘
        publish (fire-and-forget)      │                  │ consume      │ consume
   ┌────────┬─────────┬────────┬───────┴──┬──────────┐    │              │
   │patient │appoint. │clinical│ pharmacy │ lab  doc │  notification   audit
   │service │service  │service │ service  │ svc  svc │  service        service
   └────────┴─────────┴────────┴──────────┴──────────┘  (group:         (group:
                                                          curo-notification)  curo-audit)
```

- **One topic per domain**, not per event type. The event type lives in the
  envelope. This keeps per-aggregate ordering (key = aggregate id) and keeps the
  topic count manageable.
- **Consumer groups:** `curo-notification` and `curo-audit`, each subscribing to
  all six domain topics. Each group gets every event once. (Doc 02 N2 adds a
  third, narrow group: `curo-appointment` subscribes to `curo.clinical.events`
  only, to auto-advance appointment queue stages on encounter start/finish —
  the one place a domain service reacts to another domain's events.)
- **Delivery semantics:** at-least-once. The notification consumer dedupes via a
  unique `eventId` column; the audit consumer tolerates duplicates (an extra
  audit row is harmless, but dedupe it anyway the same way — cheap).
- **Failure isolation:** a poison message is caught per-message, published to the
  consumer's DLQ topic with error metadata, offset committed, processing
  continues. Consumers must never crash-loop on bad payloads.
- **Producer resilience:** if Kafka is unreachable, domain services log a warning
  and continue — an HTTP request must NEVER fail or hang because of Kafka.

### 1.1 Topics

Naming: `curo.<domain>.events`. Single broker ⇒ `replication-factor 1`.
`partitions 3` (room for future consumer parallelism). Retention 7 days
(`retention.ms=604800000`). `auto.create.topics.enable=false` — topics are
created explicitly by the `kafka-init` container.

| Topic | Message key | Published by | Event types (envelope `eventType`) |
|---|---|---|---|
| `curo.patient.events` | patientId | patient-service | `patient.registered` |
| `curo.appointment.events` | appointmentId | appointment-service | `appointment.created`, `appointment.status-changed`, `appointment.queue-stage-changed` (Doc 02), `appointment.cancelled`, `payment.recorded` |
| `curo.clinical.events` | patientId | clinical-service | `encounter.started`, `encounter.completed`, `vitals.recorded`, `prescription.created`, `lab-order.created`, `post-visit-checklist.completed` (Doc 02) |
| `curo.pharmacy.events` | prescriptionId (dispense) / stockItemId (stock) | pharmacy-service | `prescription.dispensed`, `stock.low` |
| `curo.lab.events` | serviceRequestId (order id) | lab-service | `lab.order-received`, `lab.result-ready` |
| `curo.document.events` | documentId | document-service | `document.uploaded` |
| `curo.notifications.dlq` | (copied from failed msg) | notification consumer | failed messages + error metadata |
| `curo.audit.dlq` | (copied from failed msg) | audit consumer | failed messages + error metadata |

Key choice rationale: per-aggregate ordering. Clinical uses `patientId` so all
events of one patient's visit stay in order on one partition.

### 1.2 Event envelope (v1)

Every message value is JSON:

```ts
export interface CuroEvent<TPayload = Record<string, unknown>> {
  eventId: string;          // uuid v4, generated at publish time
  eventType: string;        // e.g. 'vitals.recorded'
  version: 1;               // bump when a payload shape changes incompatibly
  occurredAt: string;       // ISO 8601
  actor: {
    userId: string | null;
    role: string | null;            // UserRole string
    practitionerId: string | null;
    patientId: string | null;
  };
  aggregate: {
    type: string;           // FHIR-ish resource type: 'Appointment', 'Observation', ...
    id: string;
  };
  payload: TPayload;        // event-specific, see §3 table
}
```

Headers on each Kafka message: `eventType`, `eventId` (lets consumers/DLQ route
without parsing the body).

---

## 2. Slice K1 — Infrastructure (compose + topics)

### 2.1 docker-compose.yml additions

Add under `services:` (infrastructure section, after `minio`):

```yaml
  kafka:
    image: apache/kafka:3.9.1
    container_name: curo_kafka
    restart: unless-stopped
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      # INTERNAL for containers, EXTERNAL for host-run dev services, CONTROLLER for KRaft
      KAFKA_LISTENERS: INTERNAL://:9092,CONTROLLER://:9093,EXTERNAL://:29092
      KAFKA_ADVERTISED_LISTENERS: INTERNAL://kafka:9092,EXTERNAL://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT,EXTERNAL:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: INTERNAL
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
      KAFKA_LOG_RETENTION_HOURS: 168
    ports:
      - "29092:29092"     # host access for dev; containers use kafka:9092
    volumes:
      - kafka_data:/var/lib/kafka/data
    healthcheck:
      test: ["CMD-SHELL", "/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 > /dev/null 2>&1"]
      interval: 15s
      timeout: 10s
      retries: 10
      start_period: 30s

  kafka-init:
    image: apache/kafka:3.9.1
    container_name: curo_kafka_init
    restart: "no"
    depends_on:
      kafka:
        condition: service_healthy
    entrypoint: ["/bin/bash", "-c"]
    command: |
      "
      for t in curo.patient.events curo.appointment.events curo.clinical.events \
               curo.pharmacy.events curo.lab.events curo.document.events \
               curo.notifications.dlq curo.audit.dlq; do
        /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 \
          --create --if-not-exists --topic $$t --partitions 3 --replication-factor 1 \
          --config retention.ms=604800000
      done
      echo 'Kafka topics ready.'
      /opt/kafka/bin/kafka-topics.sh --bootstrap-server kafka:9092 --list
      "
```

Add `kafka_data:` to the top-level `volumes:` block.

Then, for **every backend service** in compose that will publish or consume
(patient, appointment, clinical, pharmacy, lab, document, notification, audit —
NOT auth, NOT gateway):

```yaml
    environment:
      KAFKA_BROKERS: kafka:9092          # add to existing env block
    depends_on:
      kafka:                              # add alongside postgres
        condition: service_healthy
```

Do **not** make the seed container depend on kafka.

### 2.2 Dev-on-host convention

Host-run services (`npm run start:dev` from a service dir) use
`KAFKA_BROKERS=localhost:29092` — add that line to each publishing/consuming
service's `.env` file and to `.env.example`. When `KAFKA_BROKERS` is unset, the
Kafka module becomes a **no-op** (see §3.1) so nothing breaks for a service
started without the broker.

### 2.3 Checklist — Slice K1

- [ ] `kafka` + `kafka-init` services and `kafka_data` volume added to docker-compose.yml
- [ ] `KAFKA_BROKERS` env + kafka depends_on added for the 8 publishing/consuming services in compose
- [ ] `.env`/`.env.example` updated with `KAFKA_BROKERS=localhost:29092` for those services
- [ ] `docker compose up -d kafka kafka-init` → kafka healthy, init exits 0, `--list` shows all 8 topics
- [ ] Verify from host: `docker exec curo_kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic curo.appointment.events` shows 3 partitions
- [ ] Commit: `feat(kafka 1): broker + topic provisioning in compose`

*(Executor: append a short "Slice K1 verified: …" note here when done, per the
tracking convention in `00-overview.md`.)*

---

## 3. Slice K2 — Shared producer module (copied into each publishing service)

Following the repo convention, this module is **copied** into each service (no
shared npm package). Canonical copy lives in `curo-shared/src/kafka/` for
reference; working copies go into each service's `src/kafka/`.

Services that get the producer: **patient, appointment, clinical, pharmacy,
lab, document** (notification + audit get it too — they publish to their DLQs
via the same service class).

### 3.1 Files

`src/kafka/curo-event.ts` — the `CuroEvent` interface from §1.2 plus:

```ts
export const TOPICS = {
  PATIENT: 'curo.patient.events',
  APPOINTMENT: 'curo.appointment.events',
  CLINICAL: 'curo.clinical.events',
  PHARMACY: 'curo.pharmacy.events',
  LAB: 'curo.lab.events',
  DOCUMENT: 'curo.document.events',
  NOTIFICATIONS_DLQ: 'curo.notifications.dlq',
  AUDIT_DLQ: 'curo.audit.dlq',
} as const;

export type ActorLike = {
  userId?: string | null; role?: string | null;
  practitionerId?: string | null; patientId?: string | null;
} | null | undefined;
```

`src/kafka/kafka-producer.service.ts`:

```ts
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, logLevel } from 'kafkajs';
import { randomUUID } from 'crypto';
import { CuroEvent, ActorLike } from './curo-event';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer: Producer | null = null;
  private connected = false;

  async onModuleInit() {
    const brokers = (process.env.KAFKA_BROKERS ?? '').split(',').map(b => b.trim()).filter(Boolean);
    if (!brokers.length) {
      this.logger.warn('KAFKA_BROKERS not set — event publishing disabled (no-op mode)');
      return;
    }
    const kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID ?? 'curo-service',
      brokers,
      logLevel: logLevel.WARN,
      retry: { initialRetryTime: 300, retries: 5 },
    });
    this.producer = kafka.producer({ allowAutoTopicCreation: false, idempotent: true });
    try {
      await this.producer.connect();
      this.connected = true;
      this.logger.log(`Kafka producer connected (${brokers.join(',')})`);
    } catch (err) {
      // Do not crash the service; sends will retry lazily.
      this.logger.error(`Kafka connect failed: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.producer && this.connected) await this.producer.disconnect().catch(() => undefined);
  }

  /**
   * Fire-and-forget domain event publish. Never throws; never blocks the caller
   * beyond building the payload (the await is on kafkajs' local enqueue + ack,
   * wrapped in catch). Callers MUST NOT let request success depend on this.
   */
  async emit(topic: string, key: string, eventType: string,
             aggregate: { type: string; id: string },
             payload: Record<string, unknown>, actor?: ActorLike): Promise<void> {
    if (!this.producer) return; // no-op mode
    const event: CuroEvent = {
      eventId: randomUUID(),
      eventType,
      version: 1,
      occurredAt: new Date().toISOString(),
      actor: {
        userId: actor?.userId ?? null, role: actor?.role ?? null,
        practitionerId: actor?.practitionerId ?? null, patientId: actor?.patientId ?? null,
      },
      aggregate,
      payload,
    };
    try {
      if (!this.connected) { await this.producer.connect(); this.connected = true; }
      await this.producer.send({
        topic,
        messages: [{
          key,
          value: JSON.stringify(event),
          headers: { eventType, eventId: event.eventId },
        }],
      });
    } catch (err) {
      this.logger.error(`emit(${eventType}) failed: ${(err as Error).message}`);
    }
  }
}
```

`src/kafka/kafka.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { KafkaProducerService } from './kafka-producer.service';

@Global()
@Module({ providers: [KafkaProducerService], exports: [KafkaProducerService] })
export class KafkaModule {}
```

Register `KafkaModule` in each service's `app.module.ts` imports. Set a
per-service `KAFKA_CLIENT_ID` in compose env (e.g. `curo-appointment-service`).

### 3.2 kafkajs dependency

In **each** touched service: `npm install kafkajs@^2.2.4` — confirm it lands in
`"dependencies"` in package.json and package-lock.json (Docker uses
`npm ci --omit=dev`).

### 3.3 Publish points (exact instrumentation list)

Inject `KafkaProducerService` into the listed service classes and call `emit`
**after** the DB save succeeds (`await repo.save(...)` first, then
`void this.kafka.emit(...)` — do not `await` in a way that changes error paths;
`emit` never throws, so a plain `await` is also fine and preferred for
readability). Pass the authenticated user (already available as `user` /
`requestingUser` in controllers — thread it into service methods where missing)
as `actor`.

| Service / method | Topic | eventType | payload (minimum) |
|---|---|---|---|
| patient `PatientService.create` | PATIENT | `patient.registered` | `{ patientId, phn, mrn, fullName }` |
| appointment `AppointmentService.create` | APPOINTMENT | `appointment.created` | `{ appointmentId, patientId, practitionerId, start, end, isWalkIn }` |
| appointment `AppointmentService.update` (when `dto.status` changes it) | APPOINTMENT | `appointment.status-changed` (`appointment.cancelled` when new status is `cancelled`) | `{ appointmentId, patientId, practitionerId, previousStatus, newStatus }` |
| appointment `PaymentService.create` | APPOINTMENT | `payment.recorded` | `{ paymentId, appointmentId, patientId, amount, currency, collectedBy }` |
| clinical `ClinicalService.createEncounter` | CLINICAL | `encounter.started` | `{ encounterId, appointmentId, patientId, practitionerId }` |
| clinical `ClinicalService.updateEncounterStatus` (new status `completed`) | CLINICAL | `encounter.completed` | `{ encounterId, appointmentId, patientId, practitionerId }` |
| clinical `ClinicalService.addVitals` | CLINICAL | `vitals.recorded` | `{ observationId, patientId, appointmentId, encounterId, code, display, value, unit, performerRole }` |
| clinical `ClinicalService.createPrescription` | CLINICAL | `prescription.created` | `{ prescriptionId, patientId, practitionerId, medicationDisplay }` |
| clinical `ClinicalService.createLabOrder` | CLINICAL | `lab-order.created` | `{ orderId, patientId, practitionerId, testCode, testDisplay, priority }` |
| pharmacy `PharmacyService.dispense` | PHARMACY | `prescription.dispensed` | `{ dispenseId, prescriptionId, patientId, receiptNumber, medicationDisplay }` |
| pharmacy — inside dispense/stock update, when an item's remaining qty crosses below its reorder threshold | PHARMACY | `stock.low` | `{ stockItemId, drugName, quantity, reorderThreshold, organizationId }` |
| lab `LabService` order receive (`PUT /orders/:id/receive` + scan path) | LAB | `lab.order-received` | `{ orderId, patientId, testCode }` |
| lab `LabService` results entry (`POST /results`) | LAB | `lab.result-ready` | `{ orderId, reportId, patientId, practitionerId (orderer), testDisplay }` |
| document `DocumentService` upload | DOCUMENT | `document.uploaded` | `{ documentId, patientId, uploadedByRole, title, contentType }` |

Notes:
- For `vitals.recorded`, one HTTP call currently creates one Observation, so one
  event per observation is fine (the notification consumer for this event is
  added in Doc 02 and debounces per appointment — see Doc 02 §5.2).
- Read the actual method signatures before wiring — some service methods don't
  receive the acting user today; extend their parameters from the controller
  (controllers already have `@CurrentUser()`).
- `previousStatus` requires loading the row before update — the update methods
  already `findOne` first; reuse that.

### 3.4 Checklist — Slice K2

- [ ] `curo-shared/src/kafka/` canonical copy created (curo-event.ts, producer, module)
- [ ] `src/kafka/` copied into patient, appointment, clinical, pharmacy, lab, document, notification, audit services; `KafkaModule` imported in each `app.module.ts`
- [ ] `kafkajs@^2.2.4` in `dependencies` of all 8 services (verify package-lock updated)
- [ ] `KAFKA_CLIENT_ID` env per service in compose
- [ ] All publish points from §3.3 table instrumented, with real `actor` threaded from controllers
- [ ] All touched services pass `npx tsc --noEmit`
- [ ] Manual verify (host or docker): book an appointment via gateway, then `docker exec curo_kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic curo.appointment.events --from-beginning --max-messages 1` shows the envelope
- [ ] Verify resilience: stop kafka container, create an appointment → HTTP still 201, service logs a warning, no crash
- [ ] Commit: `feat(kafka 2): domain event publishing from all services`

*(Executor: append a short "Slice K2 verified: …" note here when done.)*

---

## 4. Slice K3 — Notification consumer

`curo-notification-service` consumes all six domain topics and materializes
notification rows. Frontends keep polling — zero frontend changes in this slice.

### 4.1 Recipient resolution

`Notification.recipientId` is a **userId**, but events carry
`practitionerId`/`patientId`. Add a **read-only** `User` entity copy to
notification-service (`src/entities/user.entity.ts` — copy from
auth-service, keep only columns that already exist: id, email, role,
practitionerId, patientId, isActive/active — check the auth copy for exact
names; do NOT add columns). Register it in the TypeORM entities list. Build a
small `RecipientResolverService`:

- `byPractitionerId(practitionerId) → userId | null`
- `byPatientId(patientId) → userId | null`
- `byRole(role) → userId[]` (active users only — used for role fan-out)

**Synchronize hazard warning:** because this service now maps the `users`
table, its entity copy MUST contain every column the auth-service entity has,
or TypeORM synchronize will drop columns. Copy the auth entity file verbatim.

### 4.2 Consumer service

New files in notification-service:

- `src/kafka/kafka-consumer.service.ts` — kafkajs consumer, group
  `curo-notification`, subscribes to the 6 domain topics
  (`fromBeginning: false`), `eachMessage` handler:
  1. Parse JSON → `CuroEvent`; on parse failure → DLQ + return.
  2. Look up handler by `eventType` in a handler map; unknown type → ignore (debug log).
  3. Handler builds 0..n `{recipientId, eventType, title, message, relatedResourceId, relatedResourceType}` rows.
  4. Insert with dedupe (§4.3).
  5. Any thrown error → publish original message + `{ error, failedAt, consumerGroup }` headers to `curo.notifications.dlq` via the producer service, log, and return normally (offset commits, no crash-loop).
- Wire it as a provider implementing `OnModuleInit`/`OnModuleDestroy`. If
  `KAFKA_BROKERS` unset → log warning, no-op.

### 4.3 Dedupe (at-least-once → effectively-once)

Add nullable column to `Notification` entity: `eventId: string` with
`@Index({ unique: true })` — **nullable unique is fine in Postgres** (existing
rows stay null). Insert via query builder `.orIgnore()` (ON CONFLICT DO
NOTHING) keyed on eventId. When one event fans out to several recipients, store
`eventId` as `${event.eventId}:${recipientId}` to keep uniqueness per row.

### 4.4 Event → notification mapping (initial set)

Extend `NotificationEventType` enum (append only!) in
`curo-notification-service/src/enums/index.ts` AND the curo-shared copy:
`APPOINTMENT_BOOKED = 'appointment_booked'`, `PATIENT_REGISTERED = 'patient_registered'`,
`NEW_PRESCRIPTION = 'new_prescription'`, `LAB_ORDER_PLACED = 'lab_order_placed'`,
`DOCUMENT_UPLOADED = 'document_uploaded'`, `VITALS_RECORDED = 'vitals_recorded'` (used in Doc 02),
`PATIENT_READY = 'patient_ready'` (used in Doc 02).

| Event | Recipients | NotificationEventType | Title / message sketch |
|---|---|---|---|
| `appointment.created` | the practitioner (via byPractitionerId) + the patient (via byPatientId) | APPOINTMENT_BOOKED / APPOINTMENT_CONFIRMED (patient) | "New appointment" / "{start} with Dr …" — patient copy: "Appointment confirmed" |
| `appointment.cancelled` | practitioner + patient | APPOINTMENT_CANCELLED | "Appointment cancelled" |
| `prescription.created` | all PHARMACIST users | NEW_PRESCRIPTION | "New e-prescription for {medicationDisplay}" |
| `prescription.dispensed` | patient | PRESCRIPTION_READY | "Your medication is ready — receipt {receiptNumber}" |
| `lab-order.created` | all LAB_STAFF users | LAB_ORDER_PLACED | "New lab order: {testDisplay} ({priority})" |
| `lab.result-ready` | ordering practitioner + patient | LAB_RESULTS_READY | "Results ready: {testDisplay}" |
| `stock.low` | all PHARMACIST users | LOW_STOCK_ALERT | "{drugName} below reorder level ({quantity} left)" |
| `document.uploaded` | patient | DOCUMENT_UPLOADED | "A new document was added to your record" |
| `patient.registered` | none for now (audit only) | — | — |
| `encounter.*`, `vitals.recorded`, `queue-stage-changed`, `post-visit-checklist.completed` | wired in Doc 02 §5.2 — leave handler stubs | — | — |

Keep messages free of clinical detail beyond what the recipient's role already
sees (data-minimization rule): e.g. pharmacist notification does not include
diagnosis; patient notifications never include internal ids in the message text.

### 4.5 Checklist — Slice K3

- [ ] `User` entity copy (verbatim from auth-service) + `RecipientResolverService`
- [ ] `Notification.eventId` nullable unique column added (notification-service + curo-shared copies)
- [ ] `NotificationEventType` extended (append-only) in both copies
- [ ] `kafka-consumer.service.ts` with handler map, DLQ publishing, per-message error isolation
- [ ] Handlers for the 8 mapped events implemented; Doc 02 events left as documented stubs
- [ ] `tsc --noEmit` clean
- [ ] E2E verify: receptionist books appointment → doctor's user gets a notification row (`GET /notifications` as that doctor via gateway); pharmacist sees NEW_PRESCRIPTION after doctor prescribes
- [ ] Dedupe verify: replay the same message (`kafka-console-producer` with same eventId) → no duplicate row
- [ ] Poison verify: produce a non-JSON message to `curo.appointment.events` → consumer logs, DLQ has it, service keeps running
- [ ] Commit: `feat(kafka 3): notification consumer materializes domain events`

*(Executor: append a short "Slice K3 verified: …" note here when done.)*

---

## 5. Slice K4 — Audit consumer

`curo-audit-service` consumes the same 6 topics, group `curo-audit`, and writes
`audit_logs` rows. Existing direct audit writes elsewhere remain (they carry
before/after diffs); consumer-written rows are additive coverage of domain
activity. Mapping `CuroEvent → AuditLog`:

- `userId` ← `actor.userId` (fallback `'system'`)
- `userRole` ← `actor.role`
- `action` ← derive from eventType suffix: `*.created|registered|recorded|uploaded|started` → `CREATE`; `*.status-changed|queue-stage-changed|completed|received|dispensed` → `UPDATE`; `*.cancelled` → `UPDATE`; default `CREATE`
- `resourceType` ← `aggregate.type`, `resourceId` ← `aggregate.id`
- `patientId` ← `payload.patientId` when present
- `changes` ← `{ eventType, eventId, payload }` (jsonb)
- `outcome` ← `'success'`, `outcomeDescription` ← eventType

Same consumer skeleton as K3 (copy `kafka-consumer.service.ts`, adjust group id,
DLQ topic `curo.audit.dlq`, single generic handler). Same dedupe approach: add
nullable-unique `eventId` column to the AuditLog entity — **update every AuditLog
entity copy**: audit-service, appointment-service, auth-service (admin module),
document-service (it audits), and `curo-shared` (grep for `audit-log.entity.ts`
to catch all copies; stale copies will drop the column).

### Checklist — Slice K4

- [ ] Consumer wired in audit-service (group `curo-audit`, DLQ `curo.audit.dlq`)
- [ ] Generic event→AuditLog mapping implemented
- [ ] `eventId` column added to ALL AuditLog entity copies (grep `audit-log.entity` across repos) — list the files you updated in the progress note
- [ ] `tsc --noEmit` clean on audit-service + every service whose entity copy changed
- [ ] E2E verify: book appointment → `GET /audit` as admin shows an `Appointment` CREATE row with `changes.eventType = 'appointment.created'`
- [ ] Full-stack boot verify: `docker compose up -d --build` (or host-run equivalent given the npm-in-docker caveat) — all services healthy, seed exits 0, no synchronize column drops (check service logs for `ALTER TABLE ... DROP`)
- [ ] Update `BUILD_PROGRESS.md` (or append to this doc) with a short "Kafka backbone live" note
- [ ] Commit: `feat(kafka 4): audit consumer + event-sourced audit coverage`

*(Executor: append a short "Slice K4 verified: …" note here when done.)*

---

## 6. Operational notes for the executor

- **Console debugging:**
  `docker exec curo_kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic <t> --from-beginning`
  and `kafka-consumer-groups.sh --describe --group curo-notification` for lag.
- **Ordering:** never change message keys casually — they define partition
  ordering per aggregate.
- **Adding events later (Doc 02 does):** add the eventType string + payload to
  the §3.3 table pattern, publish from the domain service, add a handler in the
  consumer(s). No topic changes needed.
- If the host cannot run Docker builds (see overview), run kafka via
  `docker compose up -d kafka kafka-init` (image pull only, no build) and run
  services on the host with `KAFKA_BROKERS=localhost:29092`.
