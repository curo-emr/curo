## Master Build Prompt: CuroMD EMR — Doctor Dashboard (Next.js App Router, Mock JSON)

You are building a **web-based EMR (Electronic Medical Record)** called **CuroMD**, focused on the **Doctor experience**. The UI must be **minimalistic, clean, and simple**, **light mode** using **shades of blue**, with **no animations**. **Functionality and UX are the #1 priority**. The codebase must be **scalable, maintainable, and production-grade** in structure (even though we use mock data now).

### 1) Tech & Project Constraints

* Framework: **Next.js (latest stable) with App Router**
* Language: **TypeScript**
* Styling: **Tailwind CSS** (light theme, blue accents)
* Components: Prefer a reusable component library approach (e.g., shadcn-style patterns), but keep it simple and consistent.
* State: Use a scalable approach (React hooks + context where needed). Avoid over-engineering, but ensure maintainability.
* Data: **No backend yet.** Use **local mock data** in `/data/*.json`.
* Architecture: Treat mock data reads like a future API layer:

  * Add a thin **data access layer** (`/lib/data/`) that reads JSON now but can later swap to API calls.
* Accessibility: Keyboard navigation, focus states, semantic HTML, proper form labels, readable contrast.
* Performance: Fast initial load, avoid unnecessary re-renders, simple caching for mock reads, clean list virtualization if lists grow.

### 2) Core Product Goals (Doctor Dashboard + Patient Chart + Encounter Workflow)

Build the following core modules:

#### A) Doctor Dashboard (Home)

The dashboard is the doctor’s command center showing “what needs attention now,” including:

1. **Today’s Schedule / Worklist**

   * Appointment cards/rows with visit statuses such as:

     * **Not arrived / Scheduled**
     * **Arrived / Waiting**
     * **In progress (being seen)**
     * **Completed**
     * **No-show / Cancelled**
   * Each entry shows: time, patient name, age, reason/visit type, provider, and optionally room (if present).
   * Quick actions: “Open chart”, “Start visit”, “Mark arrived”, “Mark in progress”, “Mark complete”.
   * Support filtering by status and quick search.
   * (This mirrors common schedule/worklist patterns where each appointment shows visit status and key patient info.) ([PCC Learn][2])

2. **Recent Patients**

   * List last N patients the doctor opened.
   * Jump back to patient chart instantly.

3. **Pending Results / Follow-ups**

   * **Pending lab results** and “needs review” items.
   * Show count + list, with ability to open the related encounter/lab order.
   * (Dashboards commonly emphasize lab tracking and tasks requiring attention.) ([PracticeStudio][1])

4. **Tasks / Messages (Standard EMR Item)**

   * Simple in-app “tasks” and/or “inbox messages” module:

     * assigned to doctor
     * due date, priority, status
   * (Common dashboard feature: tasks/messages for provider attention.) ([PracticeStudio][1])

5. **Prescription Work (Standard EMR Item)**

   * “Prescription refills requested” list and/or “recent prescriptions”.
   * (Prescription refills are often surfaced as a dashboard metric.) ([PracticeStudio][1])

6. **Global Search**

   * Prominent universal search bar supporting:

     * Patients (name, NIC/ID, phone)
     * ICD codes (code or name)
     * Medications (name, generic, brand)
     * Lab tests
     * Encounters
   * Search must be fast and forgiving (partial matches, case-insensitive).

#### B) Patient Search + Patient Chart

Provide a dedicated patient search/list page and patient chart:

1. **Patient Search / Directory**

   * Search and filters: name, age range, sex, last visit date, tags (optional).
   * Results show: name, age, sex, last visit, key alerts (allergy badge, chronic condition tag).

2. **Patient Chart (Patient Detail)**
   When selecting a patient, show a chart with:

   * Header summary: **Name, DOB, age, sex, blood type, phone, address**, patient ID.
   * **Clinical alerts**: allergies, major conditions, special notes (e.g., “high risk”).
   * Tabs/sections:

     * Overview
     * Encounters/Visits
     * Allergies
     * Medications
     * Problems/Conditions
     * Labs/Reports
     * Documents (optional placeholder)
   * Past encounters list includes: date, reason, provider, diagnoses summary, status.
   * Clicking an encounter opens **Encounter Details**.

> Ensure “allergies” are modeled as a first-class concept in the chart data (common EMR concept and also aligns with standard healthcare data modeling). ([Build FHIR][3])

#### C) Encounters (Past Visit Detail + Start New Visit)

Encounters are central. Implement:

1. **Encounter Details View**

   * Read-only display of what was recorded:

     * Visit metadata (date/time, provider, reason, status)
     * SOAP note (Subjective, Objective, Assessment, Plan)
     * Vitals (pulse, respiration, temperature, BP, height, weight, BMI, SpO2)
     * Diagnoses (linked ICD codes)
     * Medications prescribed
     * Lab orders created + status
     * Attachments/documents (placeholder)
   * SOAP is strictly structured into 4 sections. ([NCBI][4])

2. **Start New Visit**

   * From patient chart or dashboard schedule, doctor can click **“Start Visit”**.
   * Creates a new encounter in “In progress” state (in mock data layer, simulate creation).
   * Encounter editing UI includes:

##### SOAP Note Entry (Required)

* **Subjective:** chief complaint, HPI, symptoms, ROS (optional).
* **Objective:** vitals + exam findings + relevant test observations.
* **Assessment:** diagnoses, differential (optional), clinical impression.
* **Plan:** medications, lab orders, follow-up, referrals, patient instructions.

(Ensure SOAP sections are clearly delineated and easy to skim.) ([NCBI][4])

##### ICD Code Lookup & Selection (Required)

* Provide ICD code search that works **both ways**:

  * Search by **code** → shows description
  * Search by **description/keyword** → shows matching codes
* The WHO ICD browser describes “quick search” behavior that returns matching items dynamically; implement a similar feel with local mock ICD dataset. ([icd.who.int][5])
* Also include a “Diagnosis Code Navigator” style search behavior: keyword → matching categories/results. ([help.elationemr.com][6])
* In the encounter, the doctor can add multiple diagnoses, mark one as **primary**, and optionally note “suspected/confirmed”.

##### Vitals & Measurements (Required)

* Input fields for pulse, respiration, BP, temperature, height, weight, SpO2.
* Auto-calculate **BMI** from height + weight.
* Validate units and ranges gently (soft warnings, not blocking unless impossible).

##### e-Prescription (Required)

Within the active encounter, doctor can:

* Add one or more medications with:

  * medication name (search/select)
  * dose, route, frequency, duration, quantity
  * instructions (SIG)
  * refills (optional)
* **Substitutes**:

  * For each medication, allow adding substitute options (generic/brand alternatives) in case pharmacy is out of stock.
* “Send to pharmacy” behavior (mock): mark status as sent + timestamp.
* Maintain a clean prescription summary printable-like layout.

##### Lab Order / Lab Report Creation (Required)

During the encounter, doctor can create a “lab report/order” containing:

* One or more tests (search/select from test catalog)
* Clinical notes / instructions to lab
* **Priority** selector: Routine / Urgent / STAT (or at minimum: Routine / Urgent)
* “Send to laboratory” behavior (mock): mark status as sent + timestamp.
* Each test can have status: ordered, collected (placeholder), completed (placeholder), results available.

Also allow “Pending lab results” to appear on dashboard when results are not reviewed yet. (Lab tracking is commonly shown as a dashboard focus.) ([PracticeStudio][1])

---

### 3) Information & Features You Must Add (Common/Standard Items)

Add these standard EMR items as placeholders or light features (must be visible in UI even if minimal):

1. **Problem List / Conditions**

   * Chronic conditions list separate from encounter diagnoses (can reuse ICD concept but stored as “active problems”).

2. **Medication List**

   * Current meds + past meds, with start/stop dates.

3. **Allergies Module**

   * List with allergen, reaction, severity, notes. ([Build FHIR][3])

4. **Referrals (Placeholder)**

   * Ability to create a referral order (simple form; store in mock data).

5. **Audit Trail (Lightweight but present)**

   * Every significant action in mock layer writes an entry:

     * created encounter
     * updated SOAP
     * added diagnosis
     * sent prescription
     * sent lab order
   * Show it as a “History” panel on encounter (optional) or patient chart.

6. **Clinical Warnings**

   * If patient has recorded allergies, show an alert banner in encounter.
   * If prescribing a medication that appears in an “allergen cross-list” in mock data, show a warning (non-blocking).

---

### 4) Data Modeling (Mock JSON in `/data`)

Use a `/data` folder with JSON files. Design schemas clearly so later API integration is straightforward.

Create at minimum:

* `/data/patients.json`
* `/data/encounters.json`
* `/data/appointments.json`
* `/data/icd10.json` (subset mock)
* `/data/medications.json` (catalog)
* `/data/prescriptions.json`
* `/data/lab-tests.json` (catalog)
* `/data/lab-orders.json`
* `/data/tasks.json`

Define consistent IDs and relations:

* `patientId` links patient ↔ encounters ↔ appointments ↔ prescriptions ↔ labOrders.
* Encounters contain SOAP, vitals, diagnoses, and links to prescriptions/lab orders created during that encounter.

Mock data must include enough records to demonstrate:

* Multiple patients
* Each patient has multiple encounters
* At least one patient with allergies
* At least one pending lab order with results not reviewed
* At least one appointment in each status bucket

---

### 5) App Router Page Map (Required)

Implement these routes with server components where appropriate and client components where interactive:

* `/` → redirect to `/dashboard`
* `/dashboard` → doctor dashboard (schedule/worklist, tasks, pending labs, recent patients)
* `/patients` → patient directory + filters
* `/patients/[patientId]` → patient chart
* `/patients/[patientId]/encounters/[encounterId]` → encounter details (read-only + edit if “in progress”)
* `/patients/[patientId]/encounters/new` → start new visit (encounter editor)
* `/icd` → ICD search page (also reusable modal/search component)
* `/settings` → placeholder (doctor profile, preferences)

Also include a layout with:

* left sidebar navigation
* top bar with global search
* consistent breadcrumb for patient context

---

### 6) UX Requirements (Non-negotiable)

* Everything important is reachable in **≤ 2 clicks** from dashboard.
* “Start Visit” is always obvious from schedule and patient chart.
* No clutter: hide advanced sections behind collapsible panels (but no animations).
* Autosave encounter edits locally (state) and simulate persistence to mock store.
* Clear empty states: “No pending labs,” “No upcoming appointments.”
* Confirmations:

  * when sending prescription to pharmacy
  * when sending lab order to laboratory
* Error handling: if mock “write” fails (simulate optionally), show a clear toast.

---

### 7) Implementation Details for Maintainability

* Folder structure (guideline):

  * `/app` routes
  * `/components` reusable UI
  * `/features` domain modules (patients, encounters, prescriptions, labs)
  * `/lib/data` data access functions (read/write mock JSON simulation)
  * `/lib/utils` helpers (date, BMI calc, search)
  * `/types` TypeScript models
  * `/data` json mock datasets
* Use TypeScript types everywhere:

  * Patient, Encounter, Appointment, Diagnosis(ICD), VitalSigns, Prescription, Medication, LabOrder, LabTest, Task
* Searching:

  * Implement generic `searchIndex()` utility that supports fuzzy-ish contains matching and token matching.
* Keep UI consistent:

  * One primary blue, a secondary blue, subtle borders, lots of whitespace.

---

### 8) Acceptance Criteria (What “Done” Means)

* Doctor can:

  1. Open dashboard, see today’s schedule with statuses and quick actions.
  2. Search patients and open patient chart.
  3. View all past encounters.
  4. Open an encounter and see full SOAP + vitals + diagnoses + meds + labs.
  5. Start a new visit, fill SOAP, vitals, add ICD diagnosis via search by code or name.
  6. Create and send an e-prescription with substitute options.
  7. Create a lab report/order with multiple tests and assign a priority; send to lab.
  8. Dashboard shows pending lab results and tasks.

---

### 9) Notes on Clinical Documentation Standards Embedded

* SOAP note must be implemented exactly as: **Subjective, Objective, Assessment, Plan**. ([NCBI][4])
* Lab and medication ordering should be modeled as first-class clinical actions (aligning with common healthcare record structures like MedicationRequest and similar order concepts). ([Build FHIR][7])
* Appointment/schedule view should reflect visit status and key patient details in list form (typical schedule/worklist behavior). ([PCC Learn][2])

--------------------------

Here are **ready-to-copy example JSON files** for `/data/` that match the CuroMD Doctor Dashboard + Patient Chart + Encounter workflow you described. They’re small but realistic, and **all IDs link correctly across files**.

> Put these under: `data/` (e.g., `data/patients.json`, etc.)

---

## `data/patients.json`

```json
[
  {
    "id": "pat_1001",
    "mrn": "CURO-0001001",
    "name": {
      "first": "Nimal",
      "last": "Perera",
      "full": "Nimal Perera"
    },
    "dob": "1987-06-14",
    "sex": "male",
    "bloodType": "O+",
    "phone": "+94 77 123 4567",
    "email": "nimal.perera@example.com",
    "address": {
      "line1": "No 12, Station Road",
      "line2": "Negombo",
      "city": "Negombo",
      "district": "Gampaha",
      "postalCode": "11500",
      "country": "Sri Lanka"
    },
    "emergencyContact": {
      "name": "Kumari Perera",
      "relationship": "Spouse",
      "phone": "+94 77 999 8888"
    },
    "allergies": ["alg_2001", "alg_2002"],
    "problemList": ["prob_3001", "prob_3002"],
    "currentMedications": ["medrec_5001"],
    "tags": ["diabetes", "high-risk"],
    "createdAt": "2026-02-10T09:15:00+05:30",
    "updatedAt": "2026-03-01T09:30:00+05:30"
  },
  {
    "id": "pat_1002",
    "mrn": "CURO-0001002",
    "name": {
      "first": "Sajani",
      "last": "Fernando",
      "full": "Sajani Fernando"
    },
    "dob": "1995-01-22",
    "sex": "female",
    "bloodType": "A+",
    "phone": "+94 71 222 3333",
    "email": "sajani.fernando@example.com",
    "address": {
      "line1": "45, Beach Road",
      "line2": "",
      "city": "Wattala",
      "district": "Gampaha",
      "postalCode": "11300",
      "country": "Sri Lanka"
    },
    "emergencyContact": {
      "name": "A. Fernando",
      "relationship": "Father",
      "phone": "+94 71 000 1111"
    },
    "allergies": [],
    "problemList": ["prob_3003"],
    "currentMedications": [],
    "tags": ["asthma"],
    "createdAt": "2026-02-18T14:05:00+05:30",
    "updatedAt": "2026-03-01T08:10:00+05:30"
  }
]
```

---

## `data/allergies.json`

```json
[
  {
    "id": "alg_2001",
    "patientId": "pat_1001",
    "substance": "Penicillin",
    "reaction": "Rash",
    "severity": "moderate",
    "notes": "Childhood reaction; avoid beta-lactams if possible.",
    "recordedAt": "2026-02-10T09:20:00+05:30"
  },
  {
    "id": "alg_2002",
    "patientId": "pat_1001",
    "substance": "Peanuts",
    "reaction": "Hives",
    "severity": "severe",
    "notes": "Carries antihistamines.",
    "recordedAt": "2026-02-12T10:00:00+05:30"
  }
]
```

---

## `data/problems.json` (Problem List / Conditions)

```json
[
  {
    "id": "prob_3001",
    "patientId": "pat_1001",
    "icdCode": "E11.9",
    "name": "Type 2 diabetes mellitus without complications",
    "status": "active",
    "onsetDate": "2020-03-12",
    "notes": "HbA1c monitoring every 3-6 months."
  },
  {
    "id": "prob_3002",
    "patientId": "pat_1001",
    "icdCode": "I10",
    "name": "Essential (primary) hypertension",
    "status": "active",
    "onsetDate": "2022-08-01",
    "notes": "Lifestyle + meds; home BP log."
  },
  {
    "id": "prob_3003",
    "patientId": "pat_1002",
    "icdCode": "J45.909",
    "name": "Unspecified asthma, uncomplicated",
    "status": "active",
    "onsetDate": "2015-01-15",
    "notes": "Triggers: dust, smoke."
  }
]
```

---

## `data/appointments.json` (Dashboard Schedule / Worklist)

```json
[
  {
    "id": "apt_7001",
    "date": "2026-03-01",
    "time": "09:30",
    "doctorId": "doc_9001",
    "patientId": "pat_1002",
    "reason": "Wheezing, cough",
    "visitType": "OPD",
    "status": "waiting",
    "room": "Room 2",
    "notes": "Patient arrived at 09:20"
  },
  {
    "id": "apt_7002",
    "date": "2026-03-01",
    "time": "10:00",
    "doctorId": "doc_9001",
    "patientId": "pat_1001",
    "reason": "Follow-up diabetes",
    "visitType": "Follow-up",
    "status": "scheduled",
    "room": "Room 1",
    "notes": ""
  },
  {
    "id": "apt_7003",
    "date": "2026-03-01",
    "time": "10:30",
    "doctorId": "doc_9001",
    "patientId": "pat_1002",
    "reason": "Review lab results",
    "visitType": "Review",
    "status": "completed",
    "room": "Room 2",
    "notes": "Completed at 10:45"
  }
]
```

Statuses you can standardize: `scheduled | not_arrived | arrived | waiting | in_progress | completed | cancelled | no_show`

---

## `data/encounters.json`

```json
[
  {
    "id": "enc_8001",
    "patientId": "pat_1001",
    "doctorId": "doc_9001",
    "appointmentId": "apt_7002",
    "status": "completed",
    "startedAt": "2026-02-15T10:05:00+05:30",
    "endedAt": "2026-02-15T10:25:00+05:30",
    "chiefComplaint": "Routine diabetes follow-up",
    "soap": {
      "subjective": "Feels generally well. Reports occasional thirst. No chest pain. No dizziness.",
      "objective": "Vitals stable. Foot exam normal. No edema.",
      "assessment": "T2DM; consider optimizing diet. Hypertension controlled.",
      "plan": "Continue metformin. Order HbA1c + fasting glucose + lipid profile. Follow up in 3 months."
    },
    "vitals": {
      "pulseBpm": 78,
      "respirationRpm": 16,
      "bpSystolic": 126,
      "bpDiastolic": 82,
      "temperatureC": 36.8,
      "spo2Percent": 98,
      "heightCm": 172,
      "weightKg": 82
    },
    "diagnoses": [
      { "icdCode": "E11.9", "name": "Type 2 diabetes mellitus without complications", "isPrimary": true },
      { "icdCode": "I10", "name": "Essential (primary) hypertension", "isPrimary": false }
    ],
    "prescriptionIds": ["rx_6001"],
    "labOrderIds": ["lab_4001"],
    "auditTrailIds": ["aud_11001", "aud_11002", "aud_11003"]
  },
  {
    "id": "enc_8002",
    "patientId": "pat_1002",
    "doctorId": "doc_9001",
    "appointmentId": "apt_7001",
    "status": "in_progress",
    "startedAt": "2026-03-01T09:35:00+05:30",
    "endedAt": null,
    "chiefComplaint": "Wheezing and cough for 2 days",
    "soap": {
      "subjective": "Shortness of breath at night. Wheezing. No fever. Mild chest tightness.",
      "objective": "Wheezing on auscultation. No cyanosis.",
      "assessment": "Possible asthma exacerbation.",
      "plan": "Start bronchodilator. Order CBC + CRP. Review in 48 hours."
    },
    "vitals": {
      "pulseBpm": 96,
      "respirationRpm": 20,
      "bpSystolic": 118,
      "bpDiastolic": 76,
      "temperatureC": 37.1,
      "spo2Percent": 95,
      "heightCm": 160,
      "weightKg": 56
    },
    "diagnoses": [
      { "icdCode": "J45.901", "name": "Unspecified asthma with (acute) exacerbation", "isPrimary": true }
    ],
    "prescriptionIds": [],
    "labOrderIds": ["lab_4002"],
    "auditTrailIds": ["aud_11004"]
  }
]
```

> BMI should be calculated in UI: `BMI = weightKg / (heightM^2)`.

---

## `data/icd10.json` (subset mock)

```json
[
  { "code": "E11.9", "name": "Type 2 diabetes mellitus without complications", "keywords": ["diabetes", "t2dm"] },
  { "code": "I10", "name": "Essential (primary) hypertension", "keywords": ["hypertension", "high blood pressure"] },
  { "code": "J45.909", "name": "Unspecified asthma, uncomplicated", "keywords": ["asthma"] },
  { "code": "J45.901", "name": "Unspecified asthma with (acute) exacerbation", "keywords": ["asthma", "exacerbation", "wheezing"] },
  { "code": "R05", "name": "Cough", "keywords": ["cough"] }
]
```

---

## `data/medications.json` (catalog for prescription search)

```json
[
  {
    "id": "med_0101",
    "name": "Metformin 500mg Tablet",
    "genericName": "Metformin",
    "form": "tablet",
    "strength": "500mg",
    "atc": "A10BA02",
    "commonSubstitutes": ["med_0102"]
  },
  {
    "id": "med_0102",
    "name": "Metformin 850mg Tablet",
    "genericName": "Metformin",
    "form": "tablet",
    "strength": "850mg",
    "atc": "A10BA02",
    "commonSubstitutes": ["med_0101"]
  },
  {
    "id": "med_0201",
    "name": "Salbutamol Inhaler 100mcg",
    "genericName": "Salbutamol",
    "form": "inhaler",
    "strength": "100mcg",
    "atc": "R03AC02",
    "commonSubstitutes": ["med_0202"]
  },
  {
    "id": "med_0202",
    "name": "Levosalbutamol Inhaler 50mcg",
    "genericName": "Levosalbutamol",
    "form": "inhaler",
    "strength": "50mcg",
    "atc": "R03CC13",
    "commonSubstitutes": ["med_0201"]
  }
]
```

---

## `data/prescriptions.json`

```json
[
  {
    "id": "rx_6001",
    "patientId": "pat_1001",
    "encounterId": "enc_8001",
    "doctorId": "doc_9001",
    "status": "sent_to_pharmacy",
    "createdAt": "2026-02-15T10:20:00+05:30",
    "sentAt": "2026-02-15T10:22:00+05:30",
    "items": [
      {
        "id": "rxitem_1",
        "medicationId": "med_0101",
        "displayName": "Metformin 500mg Tablet",
        "dose": "500mg",
        "route": "oral",
        "frequency": "twice daily",
        "durationDays": 30,
        "quantity": 60,
        "instructions": "After meals",
        "substitutes": [
          {
            "medicationId": "med_0102",
            "displayName": "Metformin 850mg Tablet",
            "notes": "Use 850mg once daily if 500mg not available"
          }
        ]
      }
    ],
    "notesToPharmacy": "Please dispense generic if available."
  }
]
```

---

## `data/lab-tests.json` (catalog for lab report search)

```json
[
  { "id": "test_100", "code": "CBC", "name": "Complete Blood Count", "category": "Hematology" },
  { "id": "test_110", "code": "CRP", "name": "C-Reactive Protein", "category": "Biochemistry" },
  { "id": "test_120", "code": "HbA1c", "name": "Hemoglobin A1c", "category": "Diabetes" },
  { "id": "test_130", "code": "FBS", "name": "Fasting Blood Sugar", "category": "Diabetes" },
  { "id": "test_140", "code": "LIPID", "name": "Lipid Profile", "category": "Cardiology" }
]
```

---

## `data/lab-orders.json` (your “lab report” / order)

```json
[
  {
    "id": "lab_4001",
    "patientId": "pat_1001",
    "encounterId": "enc_8001",
    "doctorId": "doc_9001",
    "priority": "routine",
    "status": "results_pending",
    "createdAt": "2026-02-15T10:18:00+05:30",
    "sentToLabAt": "2026-02-15T10:19:00+05:30",
    "notesToLab": "Fasting sample required for glucose and lipid profile.",
    "tests": [
      { "testId": "test_120", "status": "ordered", "result": null },
      { "testId": "test_130", "status": "ordered", "result": null },
      { "testId": "test_140", "status": "ordered", "result": null }
    ],
    "review": {
      "isReviewed": false,
      "reviewedAt": null,
      "reviewedBy": null
    }
  },
  {
    "id": "lab_4002",
    "patientId": "pat_1002",
    "encounterId": "enc_8002",
    "doctorId": "doc_9001",
    "priority": "urgent",
    "status": "sent_to_lab",
    "createdAt": "2026-03-01T09:50:00+05:30",
    "sentToLabAt": "2026-03-01T09:51:00+05:30",
    "notesToLab": "Assess for infection/inflammation.",
    "tests": [
      { "testId": "test_100", "status": "ordered", "result": null },
      { "testId": "test_110", "status": "ordered", "result": null }
    ],
    "review": {
      "isReviewed": false,
      "reviewedAt": null,
      "reviewedBy": null
    }
  }
]
```

Priority options: `routine | urgent | stat`

---

## `data/tasks.json` (dashboard tasks/messages)

```json
[
  {
    "id": "task_9001",
    "doctorId": "doc_9001",
    "type": "lab_review",
    "title": "Review pending HbA1c/FBS/Lipid results",
    "patientId": "pat_1001",
    "relatedLabOrderId": "lab_4001",
    "priority": "high",
    "status": "open",
    "dueDate": "2026-03-02",
    "createdAt": "2026-02-15T10:25:00+05:30"
  },
  {
    "id": "task_9002",
    "doctorId": "doc_9001",
    "type": "follow_up",
    "title": "48-hour follow-up check for asthma exacerbation",
    "patientId": "pat_1002",
    "relatedEncounterId": "enc_8002",
    "priority": "medium",
    "status": "open",
    "dueDate": "2026-03-03",
    "createdAt": "2026-03-01T09:55:00+05:30"
  }
]
```

---

## `data/medication-records.json` (patient’s current meds list)

```json
[
  {
    "id": "medrec_5001",
    "patientId": "pat_1001",
    "medicationId": "med_0101",
    "displayName": "Metformin 500mg Tablet",
    "status": "active",
    "startDate": "2025-11-01",
    "endDate": null,
    "notes": "Continue unless GI side effects."
  }
]
```

---

## `data/audit-trail.json` (optional but useful)

```json
[
  {
    "id": "aud_11001",
    "entityType": "encounter",
    "entityId": "enc_8001",
    "action": "created",
    "actorId": "doc_9001",
    "timestamp": "2026-02-15T10:05:00+05:30",
    "meta": { "source": "dashboard_start_visit" }
  },
  {
    "id": "aud_11002",
    "entityType": "lab_order",
    "entityId": "lab_4001",
    "action": "sent_to_lab",
    "actorId": "doc_9001",
    "timestamp": "2026-02-15T10:19:00+05:30",
    "meta": { "priority": "routine" }
  },
  {
    "id": "aud_11003",
    "entityType": "prescription",
    "entityId": "rx_6001",
    "action": "sent_to_pharmacy",
    "actorId": "doc_9001",
    "timestamp": "2026-02-15T10:22:00+05:30",
    "meta": { "items": 1 }
  },
  {
    "id": "aud_11004",
    "entityType": "encounter",
    "entityId": "enc_8002",
    "action": "updated_soap",
    "actorId": "doc_9001",
    "timestamp": "2026-03-01T09:45:00+05:30",
    "meta": { "sections": ["subjective", "objective", "assessment", "plan"] }
  }
]
```

---

### Quick Notes (so your UI logic is easy)

* **BMI**: compute in UI from `heightCm` + `weightKg`; don’t store unless you want to cache it.
* **Pending labs on dashboard**: filter `lab-orders.json` where `review.isReviewed === false` OR `status` is pending-ish.
* **Schedule columns**: `appointments.json` is your worklist for statuses (waiting, in progress, etc.).
* **ICD search both ways**: match on `code`, `name`, `keywords`.


