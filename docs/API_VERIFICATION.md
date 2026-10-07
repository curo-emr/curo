# Curo EMR — API Endpoint Verification Report

**Last run:** 2026-06-21 · **Result: 83 / 83 checks PASS, 0 failures**
**Driver:** [`scripts/smoke-e2e.sh`](../scripts/smoke-e2e.sh) — re-run any time with `bash scripts/smoke-e2e.sh`.

Every check is made **through the API gateway at `http://localhost:3000`** with a real JWT for
the appropriate role. This exercises the gateway's token check **and** each service's
`RolesGuard`. It is also the only way in: the services' own ports (shown below) are not
published to the host.

## How to reproduce

```bash
docker compose up -d --build      # stack must be healthy first
bash scripts/smoke-e2e.sh         # human-readable PASS/FAIL log
bash scripts/smoke-e2e.sh --md    # also writes docs/API_VERIFICATION.md.rows
```

The script logs in as one user of each role, then drives the full clinical journey
(patient → appointment → encounter → vitals/notes → lab order → scan → results → prescription →
FEFO dispense → read-back), sweeps the remaining reads, exercises the secondary write/update
routes, and finishes with authorization spot-checks. IDs created in early steps are threaded
into later ones.

> ⚠️ **The write checks mutate the live seeded database** (they create a patient, appointment,
> encounter, lab order, prescription, dispense, etc.). That is intended on a dev stack. To get
> back to a pristine seed: `docker compose down -v && docker compose up -d --build`.

---

## Results by service

Legend: ✅ verified 2xx for the correct role. Paths show `:id` placeholders; the script uses
real IDs captured from prior steps.

### Auth service (`:3001` — `/auth`, `/organizations`)
| Method | Path | Role | Status |
|---|---|---|---|
| POST | `/auth/login` | each role (6) | ✅ 200 |
| POST | `/auth/refresh` | public (refresh token) | ✅ 200 |
| GET | `/auth/profile` | any authed | ✅ 200 |
| GET | `/auth/practitioners?role=DOCTOR` | any authed | ✅ 200 |
| POST | `/auth/staff` | SUPER_ADMIN | ✅ 201 |
| GET | `/auth/users?role=` | SUPER_ADMIN | ✅ 200 |
| GET | `/organizations?type=` | any authed | ✅ 200 |

### Patient service (`:3002` — `/patients`)
| Method | Path | Role | Status |
|---|---|---|---|
| POST | `/patients` | RECEPTIONIST | ✅ 201 |
| GET | `/patients?search=` | staff | ✅ 200 |
| GET | `/patients/:id` | DOCTOR | ✅ 200 |
| GET | `/patients/code/:code` | DOCTOR | ✅ 200 |
| GET | `/patients/me` | PATIENT | ✅ 200 |
| PATCH | `/patients/:id` | RECEPTIONIST | ✅ 200 |
| POST/GET | `/patients/:id/conditions` | DOCTOR | ✅ 201 / 200 |
| POST/GET | `/patients/:id/allergies` | DOCTOR | ✅ 201 / 200 |

### Appointment service (`:3003` — `/appointments`, `/payments`)
| Method | Path | Role | Status |
|---|---|---|---|
| POST | `/appointments` | RECEPTIONIST | ✅ 201 |
| GET | `/appointments?practitionerId=` | staff | ✅ 200 |
| GET | `/appointments/schedule/:practitionerId?date=` | staff | ✅ 200 |
| GET | `/appointments/patient/:patientId` | staff / PATIENT | ✅ 200 |
| GET | `/appointments/:id` | staff | ✅ 200 |
| PUT | `/appointments/:id` | RECEPTIONIST | ✅ 200 |
| POST | `/payments` | RECEPTIONIST | ✅ 201 |
| GET | `/payments/mine` · `/payments/summary` | RECEPTIONIST | ✅ 200 |
| GET | `/payments` | SUPER_ADMIN | ✅ 200 |

### Clinical service (`:3004` — `/encounters` `/notes` `/vitals` `/prescriptions` `/lab-orders` `/tasks`)
| Method | Path | Role | Status |
|---|---|---|---|
| POST | `/encounters` | DOCTOR | ✅ 201 |
| GET | `/encounters?patientId=` · `/encounters/:id` · `/encounters/patient/:id` | DOCTOR / PATIENT | ✅ 200 |
| PUT | `/encounters/:id/status` | DOCTOR | ✅ 200 |
| POST/GET | `/notes` · `/notes/encounter/:id` · `/notes/patient/:id` | DOCTOR | ✅ 201 / 200 |
| POST/GET | `/vitals` · `/vitals/patient/:id` · `/vitals/patient/:id/trends` | DOCTOR | ✅ 201 / 200 |
| POST/GET | `/prescriptions` · `/prescriptions?patientId=` · `/prescriptions/patient/:id` | DOCTOR / PATIENT | ✅ 201 / 200 |
| GET | `/prescriptions/pending` | PHARMACIST (routed here) | ✅ 200 |
| POST/GET | `/lab-orders` · `/lab-orders?patientId=` | DOCTOR | ✅ 201 / 200 |
| POST/GET/PUT | `/tasks` · `/tasks/mine` · `/tasks?status=` · `/tasks/:id` | DOCTOR | ✅ 201 / 200 |

### Lab service (`:3006` — `/orders` `/catalog` `/results` `/reports` `/instruments`)
| Method | Path | Role | Status |
|---|---|---|---|
| GET | `/orders?status=` · `/orders/:id` · `/orders/tat` | LAB_STAFF | ✅ 200 |
| GET | `/catalog` | LAB_STAFF / DOCTOR | ✅ 200 |
| POST | `/orders/scan` (per-test QR) | LAB_STAFF | ✅ 201 |
| PUT | `/orders/:id/receive` | LAB_STAFF | ✅ 200 |
| POST | `/results` | LAB_STAFF | ✅ 201 |
| GET | `/reports?patientId=` · `/reports/:id` | LAB_STAFF / DOCTOR / PATIENT | ✅ 200 |
| GET/POST/PUT | `/instruments` · `/instruments/:id/status` | LAB_STAFF | ✅ 200 / 201 |

### Pharmacy service (`:3005` — `/dispense` `/stock`)
| Method | Path | Role | Status |
|---|---|---|---|
| GET | `/stock` · `/stock/grouped` (FEFO) · `/stock?lowOnly=true` · `/stock/alerts` | PHARMACIST | ✅ 200 |
| POST/PUT | `/stock` · `/stock/:id` | PHARMACIST | ✅ 201 / 200 |
| POST | `/dispense` (FEFO multi-batch decrement) | PHARMACIST | ✅ 201 |
| GET | `/dispense?patientId=` · `/dispense/:id` | PHARMACIST | ✅ 200 |

### Notification (`:3007`), Audit (`:3008`), Document (`:3009`)
| Method | Path | Role | Status |
|---|---|---|---|
| POST/GET | `/notifications` · `/notifications/count` | any authed | ✅ 201 / 200 |
| PUT | `/notifications/:id/read` · `/notifications/read-all` | any authed | ✅ 200 |
| POST | `/audit` | any authed | ✅ 201 |
| GET | `/audit?resourceType=` | SUPER_ADMIN | ✅ 200 |
| POST | `/documents` (multipart, png/jpeg/pdf only) | DOCTOR / LAB_STAFF | ✅ 201 |
| GET | `/documents?patientId=` · `/documents/me` · `/documents/:id/content` | staff / PATIENT | ✅ 200 |

### Authorization spot-checks (expected to be denied)
| Call | Expected | Got |
|---|---|---|
| PATIENT → `POST /patients` | 403 | ✅ 403 |
| RECEPTIONIST → `GET /audit` | 403 | ✅ 403 |
| PHARMACIST → `POST /encounters` | 403 | ✅ 403 |
| no token → `GET /patients` | 401 | ✅ 401 |

---

## Findings & known quirks

These are **expected behaviors**, documented so they aren't mistaken for regressions. The first
one corrects an outdated note in the build history.

1. **`/organizations` works** (returns the seeded org directory; any authenticated user). Earlier
   notes called this a dead route — it is not. It is defined inline in
   `services/auth/src/organization/organization.module.ts` (not a separate `*.controller.ts`),
   which is why a controller-file scan missed it.
2. **Pharmacy `/prescriptions/pending` is shadowed by the gateway.** The gateway routes all
   `/prescriptions*` to the **clinical** service, so the pharmacy portal's pending queue is served
   by clinical-service's handler (which permits `PHARMACIST`). Pharmacy-service's own copy of that
   route was only reachable on its direct port `:3005`. **Resolved 2026-10-06:** the pharmacy copy
   was removed (`refactor/remove-dead-pending-route`); clinical's is the only one.
3. **`GET /health` returned 404.** `/health` was in the gateway's public-paths allowlist but no
   handler served it. **Resolved 2026-10-07:** the gateway and every backend answer
   `GET /health` → `{"status":"ok"}` without a token, and the compose health checks use it.
4. **Document uploads accept only `application/pdf`, `image/jpeg`, `image/png`** (25 MB max).
   Other content types return `400 Bad Request` by design.

## Coverage notes

83 checks cover the full clinical journey end-to-end plus all secondary read/update/cross-cutting
routes. Endpoints **not** directly exercised by the script (low-risk, equivalent paths covered):
the admin user-management variants `POST/GET/PATCH /auth/users/:id` and `/auth/users/:id/reset-password`
(the create path is covered via `/auth/staff`; the list path via `GET /auth/users`). Add these to the script if full admin-CRUD
verification is needed.
