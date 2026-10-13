# Curo EMR — Manual End-to-End Testing Guide

This guide walks one patient through the **entire clinical journey** across all five role
portals, so you can manually confirm each application works and see the data flow between them:

> **Registration → Appointment → Doctor visit → Lab order & results → Pharmacy dispense →
> Results back to doctor & patient.**

Each step lists **(A)** what to click in the portal UI and **(B)** the underlying gateway API
call (so you can verify with `curl`/Scalar if the UI is ambiguous). UI button labels may differ
slightly from the wording here — follow the intent. The same journey is automated in
[`scripts/smoke-e2e.sh`](../scripts/smoke-e2e.sh) and documented at the API level in
[`API_VERIFICATION.md`](./API_VERIFICATION.md).

## Before you start

```bash
make run      # builds the images one at a time; wait until `docker compose ps` shows all healthy
```

- Gateway: **http://localhost:3000** · Live API reference: **http://localhost:3000/docs**
- Logins & portal URLs: see [`TEST_CREDENTIALS.md`](./TEST_CREDENTIALS.md).
- The IDs you create early (patientId, appointmentId, encounterId, orderId, prescriptionId) thread
  into later steps. The UI carries these for you; with curl, copy them between calls.

> ⚠️ This walkthrough **creates real rows** in the seeded dev database. To start again from a
> fresh seed, see [Re-seeding](./TEST_CREDENTIALS.md#re-seeding).

---

## Step 1 — Receptionist registers a patient  ·  Portal :3012

**(A) UI** — Log in as `chamali@curo.test` / `Recept@123`. Go to **Patients → New / Register
Patient**. Fill first name, last name, date of birth, gender (+ phone/address). **Save**. The new
patient appears in the list with a generated patient code (e.g. `CUR-XXXXXXXX`) and PHN.

**(B) API** — `POST /patients` (role RECEPTIONIST)
```json
{ "firstName": "Nimal", "lastName": "Test", "birthDate": "1988-03-21", "gender": "male", "phone": "0771234567" }
```
→ **capture `id` = patientId.** Confirm with `GET /patients?search=Test`.

**✅ Verify:** patient shows in the list; `GET /patients/{patientId}` returns the record.

---

## Step 2 — Receptionist books an appointment + takes payment  ·  Portal :3012

**(A) UI** — Still as receptionist: open the patient (or **Appointments → New**). Pick a **doctor**
(e.g. Priya Rajapaksa), a visit type, a free slot in one of their sessions, reason. **Book**. Then
record the consultation **payment** (amount, cash). When the patient arrives, **check them in** from
the Queue.

**(B) API**
1. Pick a doctor: `GET /auth/practitioners?role=DOCTOR` → **capture a `id` = practitionerId**.
   Their weekly sessions: `GET /schedules?practitionerId=<practitionerId>` (weekday 0 is Sunday,
   times on the clinic's clock, Asia/Colombo).
2. `POST /appointments`, for a slot inside one of those sessions that hasn't passed (otherwise `400`;
   a slot already taken is `409`)
   ```json
   { "patientId": "<patientId>", "practitionerId": "<practitionerId>", "serviceType": "consultation",
     "start": "<date>T09:00:00+05:30", "end": "<date>T09:15:00+05:30", "reasonCode": "checkup" }
   ```
   `serviceType` is one of `consultation`, `follow_up`, `procedure`, `emergency`.
   → **capture `id` = appointmentId.**
3. `POST /payments` `{ "patientId": "<patientId>", "appointmentId": "<appointmentId>", "amount": 2500, "paymentMethod": "cash" }`
   (one payment per visit; a second is `409`)
4. Check in: `PUT /appointments/{appointmentId}` `{ "status": "arrived" }`. Only a checked-in visit
   can later be marked `fulfilled`.

**✅ Verify:** appointment appears on the doctor's schedule
(`GET /appointments/schedule/{practitionerId}?date=<date>`); payment in `GET /payments/mine`.

---

## Step 3 — Doctor sees the patient (encounter, vitals, notes)  ·  Portal :3010

**(A) UI** — Log in as `dr.priya@curo.test` / `Doctor@123`. Open today's **schedule / queue**,
click the patient. Review allergies & conditions. **Start visit** (encounter). Record **vitals**
(e.g. temperature), write a **clinical note** (SOAP), optionally add a **diagnosis/condition**.

**(B) API** (clinical-service via gateway)
1. Context: `GET /patients/{patientId}`, `GET /patients/{patientId}/allergies`, `GET /patients/{patientId}/conditions`.
2. `POST /encounters` `{ "patientId": "<patientId>", "appointmentId": "<appointmentId>", "reasonCode": "checkup" }` → **capture `id` = encounterId.**
3. `PUT /encounters/{encounterId}/status` `{ "status": "in-progress" }`
4. `POST /vitals` `{ "patientId": "<patientId>", "encounterId": "<encounterId>", "code": "8310-5", "display": "Body temperature", "valueQuantity": 37, "valueUnit": "Cel" }`
5. `POST /notes` `{ "patientId": "<patientId>", "encounterId": "<encounterId>", "subjective": "...", "assessment": "...", "plan": "..." }`
6. Diagnosis (patient-service): `POST /patients/{patientId}/conditions` `{ "clinicalStatus": "active", "code": "E11.9", "display": "Type 2 diabetes mellitus" }`

**✅ Verify:** `GET /encounters?patientId={patientId}` shows the encounter; `GET /vitals?patientId={patientId}` and `GET /notes?encounterId={encounterId}` return your entries.

---

## Step 4 — Doctor orders a lab test  ·  Portal :3010

**(A) UI** — In the open encounter, go to **Labs / Order Test**, choose a panel (e.g. **CBC**),
add the individual tests, **Order**. The order is created with **QR codes** (one per test).

**(B) API** — `POST /lab-orders` (clinical-service), sent to one lab: find its id with
`GET /organizations?type=laboratory` (Curo Diagnostics — Colombo is the lab `tharindi.lab` works at).
```json
{ "patientId": "<patientId>", "encounterId": "<encounterId>", "performerOrganizationId": "<labId>",
  "code": "58410-2", "display": "CBC panel",
  "testPanel": [ { "code": "718-7", "display": "Hemoglobin" }, { "code": "4544-3", "display": "Hematocrit" } ] }
```
→ **capture `id` = orderId.** Response includes an order-level QR + one QR per test (base64).

> 💡 Because clinical-service and lab-service share the database, this order appears in the lab
> portal immediately — no message passing.

---

## Step 5 — Lab staff process the sample (scan QR, receive, enter results)  ·  Portal :3013

**(A) UI** — Log in as `tharindi.lab@curo.test` / `LabStaff@123`. Open the **worklist** — the new
order is there. **Scan** the per-test QR on the tube, mark the sample **Received**, then **Enter
results** for each test (value, unit, reference range, interpretation) and **Finalize**. A PDF
diagnostic report is generated.

**(B) API** (lab-service)
1. `GET /orders?status=active` → find your `orderId`; `GET /orders/{orderId}` shows per-test QRs.
2. `POST /orders/scan` `{ "qrData": "http://localhost:3000/lab/orders/{orderId}?test=718-7&i=0" }`
3. `PUT /orders/{orderId}/receive` `{}`
4. `POST /results`
   ```json
   { "serviceRequestId": "<orderId>", "results": [ { "code": "718-7", "display": "Hemoglobin", "value": 14.2, "unit": "g/dL", "referenceRangeLow": "13", "referenceRangeHigh": "17", "interpretation": "N" } ], "conclusion": "Within normal limits" }
   ```
   → order flips to **COMPLETED**, a `DiagnosticReport` (PDF) is created.

**✅ Verify:** `GET /reports?patientId={patientId}` returns the finished report; `GET /orders/{orderId}` shows status completed.

---

## Step 6 — Doctor prescribes medication  ·  Portal :3010

**(A) UI** — Back as the doctor, in the encounter go to **Prescriptions / Medications**, add a drug
from the medication catalog (e.g. **Metformin 500mg Tablet**), dose, quantity, and the pharmacy
to send it to, **Prescribe**.

**(B) API** — `POST /prescriptions` (clinical-service). The drug is named by its code in
`GET /medication-catalog` (a code the catalog lacks is `400`; the name comes from the catalog), and
the pharmacy by its id from `GET /organizations?type=pharmacy` (Curo Pharmacy — Colombo is
`kasun.pharma`'s).
```json
{ "patientId": "<patientId>", "encounterId": "<encounterId>", "performerOrganizationId": "<pharmacyId>",
  "medicationCode": "med_0101", "dosageText": "1 tab BD", "quantityValue": 60, "quantityUnit": "tablet" }
```
→ **capture `id` = prescriptionId.** Stored as an active `MedicationRequest`.

---

## Step 7 — Pharmacy dispenses (FEFO multi-batch)  ·  Portal :3014

**(A) UI** — Log in as `kasun.pharma@curo.test` / `Pharma@123`. Open the **Pending prescriptions**
queue — the new prescription is there. Check **stock** (drugs are grouped, batches listed
**earliest-expiry-first / FEFO**). **Dispense**. Stock decrements across batches automatically.

**(B) API** (pharmacy-service)
1. `GET /prescriptions/pending` → find your prescription.
2. `GET /stock/grouped` (FEFO batch order); low stock via `GET /stock/alerts`.
3. `POST /dispense`
   ```json
   { "medicationRequestId": "<prescriptionId>", "quantityValue": 60, "quantityUnit": "tablet" }
   ```
   The patient, price and dispenser come from the prescription, the stock and your login. Stock is
   received by catalog code: `POST /stock` `{ "medicationCode": "med_0101", "quantity": 60, "unitPrice": 1 }`.
   → prescription flips to **COMPLETED**; the dispense record notes which batches were drawn (e.g. `B1×40, B2×20`).

**✅ Verify:** `GET /dispense?patientId={patientId}` shows the dispense; the prescription no longer appears in the pending queue.

---

## Step 8 — Results flow back to doctor & patient

**(A) Doctor UI (:3010)** — Reopen the patient; the **lab report** and **dispense status** are
visible in their history.

**(A) Patient UI (:3011)** — Log in as the patient (e.g. `samantha@email.com` / `Patient@123` for a
patient with rich history, or your newly created patient if you gave them a login). They see their
appointments, visit notes, lab reports and prescriptions — **own records only**.

**(B) API**
- Doctor: `GET /lab-orders?patientId={patientId}`, `GET /reports?patientId={patientId}`.
- Patient (their own token): `GET /patients/me`, `GET /appointments/patient/{patientId}`,
  `GET /encounters/patient/{patientId}`, `GET /prescriptions/patient/{patientId}`,
  `GET /reports?patientId={patientId}`.

**✅ Verify:** the patient sees the lab report and prescription created above; attempting to read
another patient's record is denied.

---

## Cross-cutting checks (any time)

- **Notifications** (any logged-in user): bell icon / `GET /notifications`, `GET /notifications/count`.
- **Audit log** (admin only, :3015): `GET /audit?patientId={patientId}`. Creating, changing and
  opening each record above is logged by the service that holds it; reading a list (say, a
  patient's vitals) is one `READ` entry on the patient, describing what was read.
- **Admin** (:3015, `admin@curo.test`): manage users (`GET /auth/users`), view all payments
  (`GET /payments`), organizations (`GET /organizations`).
- **Authorization:** try a patient hitting `POST /patients` → **403**; no token → **401**. (Expected.)

## Notable features to eyeball

| Feature | Where | What to confirm |
|---|---|---|
| Per-test QR codes | Lab order (step 4–5) | Each test in a panel gets its own QR; scanning marks that specific tube |
| FEFO multi-batch dispense | Pharmacy (step 7) | Stock consumed earliest-expiry-first, across multiple batches |
| Cross-service via shared DB | Steps 4→5, 6→7 | Orders/prescriptions appear in lab/pharmacy with no manual hand-off |
| Role isolation | Step 8 / authz | Patients see only their own data; staff scoped by role |
