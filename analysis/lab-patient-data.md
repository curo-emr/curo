# Curo Lab frontend: patient-related data visible to lab users

Scope inspected: `/Users/admin/Developer/curo/curo-lab` Next.js frontend routes, dashboard components, API clients/mappers, shared types, constants, and mock/static data. No project/source files were modified.

## role/frontend summary

- The lab frontend is a protected “Laboratory Portal” dashboard. `src/app/(dashboard)/layout.tsx:12-24` wraps all dashboard routes with `ProtectedRoute`; `src/components/layout/Sidebar.tsx:20-28` exposes Dashboard, Worklist, Patients, Test Catalog, Reports, QC, and Settings.
- Auth only checks for a logged-in user; no frontend role gate was found beyond `AuthUser.role` being stored. `src/contexts/AuthContext.tsx:6-13` defines `role`, and `src/components/layout/ProtectedRoute.tsx:9-31` redirects only unauthenticated users.
- Patient-related data comes primarily from live API clients, not the local mock files. `src/lib/api/client.ts:3-10` uses `NEXT_PUBLIC_API_URL` or `http://localhost:3000` and attaches bearer tokens. `src/lib/data/api.ts:1-18` re-exports API-backed lab/patient methods and uses static data only for the test catalog.

## user-facing screens/features

### `/dashboard` — Laboratory Dashboard

Evidence:
- `src/app/(dashboard)/dashboard/page.tsx:23-30` loads `getLabOrders()`, `getPatients()`, `getLabTestCatalog()`, and `getLabInstruments()`.
- `src/app/(dashboard)/dashboard/page.tsx:47-67` renders dashboard stats, urgent orders, recent activity, QC alerts, and instrument status.
- `src/components/features/dashboard/UrgentOrdersList.tsx:37-56` displays urgent/stat order ID, priority, status, patient name, and ordered test names.
- `src/components/features/dashboard/RecentActivityFeed.tsx:26-40` displays recent order ID, patient name, created date, priority indicator, and status.
- `src/components/features/dashboard/LabDashboardStats.tsx:8-14` displays aggregate counts for order statuses.

Visible patient-related data:
- Patient name linked to lab orders.
- Order IDs, priority, status, created date.
- Names of ordered tests for urgent/stat orders.
- Aggregate lab order counts.

### `/worklist` — Worklist

Evidence:
- `src/app/(dashboard)/worklist/page.tsx:18-20` loads all lab orders, all patients, and test catalog.
- `src/components/features/worklist/WorklistTable.tsx:50-61` lets users search by order ID, patient name, or MRN.
- `src/components/features/worklist/WorklistTable.tsx:143-184` table columns include Order ID, Patient, Tests, Priority, Status, and Created.
- `src/components/features/worklist/WorklistFilters.tsx` filters by priority and department UI, though department filtering is not actually applied in `WorklistTable.tsx:63-80` except tracked in state.

Visible patient-related data:
- Patient name and MRN for each order.
- Order ID, number of tests, priority, status, created date.
- Searchability by patient name and MRN.

### `/worklist/[orderId]` — Lab order detail

Evidence:
- `src/app/(dashboard)/worklist/[orderId]/page.tsx:27-35` loads a lab order, then the associated patient, test catalog, and results by order.
- `src/app/(dashboard)/worklist/[orderId]/page.tsx:64-84` displays order short ID, status, priority, ordered date, and actions to receive order or enter results.
- `src/app/(dashboard)/worklist/[orderId]/page.tsx:99-108` displays Patient Information: name, MRN, age/sex, blood type.
- `src/app/(dashboard)/worklist/[orderId]/page.tsx:113-136` displays ordered tests, test code/category from catalog, and whether results are available.
- `src/app/(dashboard)/worklist/[orderId]/page.tsx:148-188` displays result rows: test name, value/unit, reference range, abnormal flag, performed date, and conclusion if present.
- `src/app/(dashboard)/worklist/[orderId]/page.tsx:201-229` displays order status timeline and Notes to Lab.

Visible patient-related data:
- Patient name, MRN, age derived from DOB, sex, blood type.
- Order priority/status/dates.
- Ordered tests and categories.
- Lab result values/units/reference ranges/flags/conclusion/performed date.
- Notes to Lab.

### `/worklist/[orderId]/results` — Results entry

Evidence:
- `src/app/(dashboard)/worklist/[orderId]/results/page.tsx:18-24` loads order, associated patient, and catalog.
- `src/app/(dashboard)/worklist/[orderId]/results/page.tsx:33-40` displays page title with order ID, patient full name, and MRN.
- `src/components/features/worklist/ResultsEntryForm.tsx:53-67` displays Order ID, Patient, and Status.
- `src/components/features/worklist/ResultsEntryForm.tsx:72-131` renders result-entry fields per ordered test component, including component name, input value, unit, reference range, auto flag, and notes textarea.
- `src/components/features/worklist/ResultsEntryForm.tsx:36-43` save/submit actions are demo-mode toasts; this component does not call the `enterResults` API.

Visible/enterable patient-related data:
- Patient name and MRN.
- Order ID and status.
- Ordered test names/codes and components.
- Result values entered by user, units, reference ranges, auto-generated low/high/normal flags, component notes.

### `/patients` — Patient Directory

Evidence:
- `src/app/(dashboard)/patients/page.tsx:16-18` loads all patients and all lab orders.
- `src/components/features/patients/PatientList.tsx:28-39` searches by patient full name, MRN, or phone.
- `src/components/features/patients/PatientList.tsx:76-111` displays patient name, MRN, age/sex, blood type, last lab order date, total order count, and link to detail.

Visible patient-related data:
- Patient name, MRN, age, sex, blood type.
- Patient phone is searchable but not displayed in the table.
- Last lab order date and total lab order count.

### `/patients/[patientId]` — Patient detail / lab history

Evidence:
- `src/app/(dashboard)/patients/[patientId]/page.tsx:27-30` loads patient details, patient lab orders, patient lab results, and catalog.
- `src/app/(dashboard)/patients/[patientId]/page.tsx:51-61` displays patient full name, MRN, age/sex, blood type, phone, email.
- `src/app/(dashboard)/patients/[patientId]/page.tsx:72-106` shows Lab Orders tab with order short ID, status, priority, test names, ordered date, and link to order detail.
- `src/app/(dashboard)/patients/[patientId]/page.tsx:112-139` shows Results History tab with report date, test names, values, units, and abnormal flags.

Visible patient-related data:
- Patient name, MRN, age, sex, blood type, phone, email.
- All lab orders for that patient: IDs, statuses, priorities, test names, ordered dates.
- All lab results for that patient: performed date, test names, values, units, abnormal flags.

### `/reports` — Lab analytics

Evidence:
- `src/app/(dashboard)/reports/page.tsx:15-17` loads all lab orders and catalog.
- `src/app/(dashboard)/reports/page.tsx:22-68` derives total orders, rejection rate, most ordered tests, status distribution, and priority distribution.
- `src/app/(dashboard)/reports/page.tsx:73-172` renders aggregate metrics/charts.

Visible patient-related data:
- No individual patient identifiers on this screen.
- Aggregate patient/order-derived data: total order count, most ordered test, rejection rate, order status distribution, volume by priority.

### `/test-catalog` — Test Catalog

Evidence:
- `src/app/(dashboard)/test-catalog/page.tsx:15-17` loads static test catalog.
- `src/components/features/test-catalog/TestCatalogList.tsx:16-39` searches/filters tests by name/code/department/specimen type.
- `src/components/features/test-catalog/TestCatalogList.tsx:88-137` displays test name, code, department, specimen type, TAT, price, container type, and component reference ranges.

Visible patient-related data:
- No individual patient data.
- Clinical/billing-adjacent catalog data available for patient orders: lab tests, specimen requirements, prices, reference ranges.

### `/qc` — Quality Control

Evidence:
- `src/app/(dashboard)/qc/page.tsx:15-29` loads lab instruments and displays instrument cards.
- `src/app/(dashboard)/qc/page.tsx:43` renders `QCLogTable` with empty `logs={[]}` and `staff={[]}`.
- `src/components/features/qc/QCLogTable.tsx` can display instrument/test code/control/values/status/performed by/performed at/notes if logs are supplied, but current page passes no patient-linked data.

Visible patient-related data:
- No patient identifiers or patient results. Instrument status only.
- Caveat: QC logs are not patient-specific, but instrument IDs in result data can link patient results to instruments internally.

### `/settings`

Evidence:
- `src/app/(dashboard)/settings/page.tsx:41-107` displays editable demo lab technician profile fields: first/last name, department, employee ID, email, phone, address.

Visible patient-related data:
- No patient data. Staff account/contact data is visible.

## patient-identifying data

### Actually displayed in UI

- Full name:
  - Worklist table: `src/components/features/worklist/WorklistTable.tsx:164-168`.
  - Patient list: `src/components/features/patients/PatientList.tsx:95-98`.
  - Patient detail: `src/app/(dashboard)/patients/[patientId]/page.tsx:53`.
  - Order detail: `src/app/(dashboard)/worklist/[orderId]/page.tsx:104`.
  - Results entry: `src/app/(dashboard)/worklist/[orderId]/results/page.tsx:35`; `ResultsEntryForm.tsx:61-63`.
- MRN/patient code:
  - Worklist table: `WorklistTable.tsx:166-168`.
  - Patient list: `PatientList.tsx:96-97`.
  - Patient detail: `patients/[patientId]/page.tsx:54`.
  - Order detail: `worklist/[orderId]/page.tsx:105`.
  - Results entry: `worklist/[orderId]/results/page.tsx:35`.
- Age derived from DOB and sex:
  - Patient list: `PatientList.tsx:101-103`.
  - Patient detail: `patients/[patientId]/page.tsx:38,57`.
  - Order detail: `worklist/[orderId]/page.tsx:59,106`.
- Blood type:
  - Patient list: `PatientList.tsx:104`.
  - Patient detail: `patients/[patientId]/page.tsx:58`.
  - Order detail: `worklist/[orderId]/page.tsx:107`.
- Phone and email:
  - Patient detail displays both: `patients/[patientId]/page.tsx:59-60`.
  - Patient directory searches by phone: `PatientList.tsx:31-39` and placeholder at `PatientList.tsx:58`.
- Order-linked patient name:
  - Dashboard urgent/recent activity: `UrgentOrdersList.tsx:50`; `RecentActivityFeed.tsx:34-37`.

### Available in patient type/API mapping but not displayed in current lab UI

Evidence:
- `src/types/index.ts:8-34` includes `Patient` fields: `id`, `mrn`, optional `nic`, name, DOB, sex, blood type, nationality, marital status, phone, email, address, emergency contact, allergies, problem list, current medications, tags, created/updated timestamps.
- `src/lib/api/mappers.ts:139-183` maps FHIR Patient identifiers/telecom/address/extensions/contact to local patient fields, including patient code, NIC, phone, email, blood type, nationality, marital status, address, emergency contact, created/updated timestamps.
- `data/patients.json:1-120+` mock data contains concrete examples of full address, emergency contacts, allergies/problem/current-medication IDs, and tags.

Not currently displayed on inspected lab screens:
- NIC.
- Nationality.
- Marital status.
- Address.
- Emergency contact name/relationship/phone.
- CreatedAt/updatedAt.
- Tags, allergies IDs, problem IDs, current medication IDs from mock/local type.

## clinical data

### Displayed or visible through screens

- Age/sex and blood type are shown in patient/order views (see above).
- Lab test names, component names, reference ranges, units, and abnormal flags are visible throughout worklist/order/patient detail/results entry.
- Notes to Lab are displayed on order detail if present: `src/app/(dashboard)/worklist/[orderId]/page.tsx:222-229`. In the FHIR mapper, this is sourced from `ServiceRequest.note[0].text` as `notesToLab` (`src/lib/api/mappers.ts:357`).
- Result conclusions are displayed on order detail if provided by API result objects: `worklist/[orderId]/page.tsx:186-188`.
- Mock lab orders include clinical notes such as known diabetes, suspected infection, chest pain/rule out MI, pre-surgery workup, dengue suspected, recurrent UTI, long-term medication, etc. Evidence: `data/lab-orders.json:16`, `:38`, `:82`, `:126`, `:182`, `:204`, `:226`, `:270`, `:292`.

### Available in types/API mapping but not loaded by visible lab screens

- Allergies and conditions clients exist:
  - `src/lib/api/patients.ts:28-36` calls `/patients/{id}/allergies` and `/patients/{id}/conditions`.
  - `src/lib/api/mappers.ts:185-213` maps allergy substance, reaction, severity, notes, recordedAt.
  - `src/lib/api/mappers.ts:215-235` maps condition ICD code, name, clinical status, onset date, notes.
- `src/types/index.ts:37-57` defines full `Allergy` and `Problem` data shapes.
- These allergy/condition methods were not imported or used by inspected lab pages, so they do not appear user-visible in current frontend.

## appointment/encounter data

### Visible in current UI

- No appointment list/schedule screen exists in the lab frontend route set.
- Encounter IDs may be present in lab order data but are not displayed. `LabOrder` includes `encounterId` in `src/types/index.ts:211-222`; mapper fills it from `ServiceRequest.encounter.reference` in `src/lib/api/mappers.ts:335-350`.

### Available in shared types/mappers but not surfaced

- `src/types/index.ts:59-80` defines `Appointment` with date/time/doctorId/patientId/reason/visitType/status/room/notes.
- `src/types/index.ts:82-99` defines `Encounter` with patientId/doctorId/appointmentId/status/start/end/chief complaint/SOAP.
- `src/lib/api/mappers.ts:237-282` maps FHIR Appointment fields including participant patient/practitioner, reason, visit type, status, and comment.
- `src/lib/api/mappers.ts:284-325` maps FHIR Encounter including patient, practitioner, appointment, chief complaint, and SOAP subjective/objective/assessment/plan.
- No appointment or encounter API client usage was found in current lab pages/components.

## medication/prescription data

### Visible in current UI

- No prescription/medication screen exists in the lab frontend.
- Medication-related clinical context may appear in `notesToLab` or mock `clinicalNotes` (e.g., “Hypertensive patient on Losartan” in `data/lab-orders.json:60-71`, “Patient on long-term medication” in `data/lab-orders.json:203-215`), but the current API-backed UI only displays `notesToLab` if provided.

### Available in types/mappers/mock data but not surfaced

- `src/types/index.ts:101-123` defines `PrescriptionItem` and `Prescription` with medication display name, dose, route, frequency, duration, quantity, instructions, and pharmacy notes.
- `src/lib/api/mappers.ts:327-331` maps FHIR MedicationRequest raw fields; `src/lib/api/mappers.ts:327-331` through `mapFhirMedicationRequest` maps medication name/code, dose, route, frequency, duration, quantity, instructions, and notes to pharmacy.
- `src/types/index.ts:27` includes `Patient.currentMedications`; `data/patients.json:26` etc. has current medication IDs. These IDs are not displayed by lab UI.

## lab/order/results data

### Lab orders

Visible fields:
- Order short ID (`id.slice(0, 8).toUpperCase()`), status, priority, created/ordered date: worklist, dashboard, patient detail, order detail.
- Patient ID is used internally to resolve patient name/MRN.
- Test count or test names, depending on screen.
- Ordered tests, test code/category from catalog, result availability.
- Order lifecycle dates: ordered/created and sent-to-lab dates are visible in order detail status timeline.
- Notes to Lab visible on order detail.

Type/API fields:
- `src/types/index.ts:194-223` defines `LabOrder`: `id`, `patientId`, `encounterId`, `doctorId`, `priority`, `status`, `createdAt`, `sentToLabAt`, `notesToLab`, `tests`, review info, `showResultsToPatient`.
- `src/lib/api/lab.ts:7-18` calls `/orders` and `/orders/{id}`; `src/lib/api/lab.ts:21-31` filters by patient, receives order, or scans QR.
- `src/lib/api/mappers.ts:333-366` maps FHIR `ServiceRequest` subject/requester/encounter/priority/status/note/code to `LabOrder`.

Mock order-only fields not used by current API mapper/UI:
- `data/lab-orders.json` includes `accessionNumber`, `doctorName`, `orderedAt`, `receivedAt`, `collectedAt`, `collectedBy`, `specimenType`, `specimenCondition`, `department`, `clinicalNotes`, `rejectionReason`, and test result IDs. These are not represented in current `LabOrder` type/API mapper except conceptually status/priority/tests/notes.

### Lab results/reports

Visible fields:
- In patient detail Results History: report date/performedAt, test name, value, unit, abnormal/critical flag (`patients/[patientId]/page.tsx:120-139`).
- In order detail Results: performedAt, test name, value/unit, reference range, flag, conclusion (`worklist/[orderId]/page.tsx:148-188`).
- In results entry: result component fields, value input, unit, reference range, calculated flag, optional notes (`ResultsEntryForm.tsx:72-131`).

API result fields:
- `src/lib/api/lab.ts:34-53` defines API `LabResultItem`: `testCode`, `testName`, `value`, `unit`, `referenceRange`, `flag` and `LabResult`: `id`, `orderId`, `patientId`, `performedAt`, `reportedAt`, `results`, `conclusion`, `status`.
- `src/lib/api/lab.ts:56-62` posts new results to `/results`, though current `ResultsEntryForm` does not call it.
- `src/lib/api/lab.ts:65-72` fetches reports from `/reports` by `orderId` or `patientId`.

Type/mock result fields:
- `src/types/index.ts:226-245` defines another local `LabResult` shape with `performedBy`, `verifiedBy`, `instrumentId`, `verifiedAt`, and `values[]` containing componentId/value/flag/notes.
- `data/lab-results.json:1-118+` includes patient-linked results with numeric/string values, flags including high/low/critical/abnormal, component notes, performedBy/verifiedBy staff IDs, instrument IDs, performedAt/verifiedAt.

### Test catalog

Visible fields:
- Test code, name, department/category, specimen type, container type, TAT, price, components, units, reference ranges.
- Evidence: `src/types/index.ts:158-173`; `src/components/features/test-catalog/TestCatalogList.tsx:88-137`; `data/lab-tests.json:1-120+`.

## billing/insurance/payment data

- Patient-specific billing, insurance, claims, invoices, and payments were not found in the lab frontend routes/components/API clients/types.
- Test catalog includes prices visible to lab users: `src/types/index.ts:169` defines optional `price`; `data/lab-tests.json:8`, `:25`, `:40`, `:55`, etc. contain prices; `src/components/features/test-catalog/TestCatalogList.tsx:117-121` displays `Rs. {test.price}` when available.
- Reports page includes aggregate lab order metrics, not payment/billing data.

## documents/files

- No patient documents/files upload, attachment, report PDF, image, or file viewer route/component/API was found in the inspected lab frontend.
- The closest related data is the `/reports` API for lab result records (`src/lib/api/lab.ts:65-72`) and result/report displays in patient/order detail, but no document/file object is exposed in frontend types.

## staff/facility data linked to patients

### Staff/practitioner/doctor links

- `LabOrder` includes `doctorId` and `encounterId` (`src/types/index.ts:211-212`), and the FHIR mapper extracts `doctorId` from `ServiceRequest.requester.reference` (`src/lib/api/mappers.ts:335-350`), but current UI does not display doctor name/ID.
- Mock `data/lab-orders.json` includes `doctorName`, `collectedBy`, and result IDs; current API-backed UI does not display these mock fields.
- Mock `data/lab-results.json` includes `performedBy`, `verifiedBy`, and `instrumentId`; current API `LabResult` type in `src/lib/api/lab.ts:45-53` does not include staff IDs or instrument IDs, so they are not visible in current order/patient result UI.
- `data/lab-staff.json:1-60` contains staff names, roles, departments, employee IDs, email, phone, qualifications, shifts, joinedAt. `src/lib/data/api.ts:24-26` currently stubs `getLabStaff()` to return `[]`; QC and worklist pass empty staff arrays.

### Facilities/instruments/specimens/departments

- Instrument status is visible on dashboard and QC pages. `src/app/(dashboard)/dashboard/page.tsx:75-97` and `src/app/(dashboard)/qc/page.tsx:21-39` show instrument name/model/location/status.
- `src/lib/api/lab.ts:77-91` calls `/instruments` and `/instruments/{id}/status` with fields id/name/model/serialNumber/status/calibration/location.
- Test catalog visibly links tests to departments, specimen types, and containers.
- Current API-mapped lab orders do not expose specimen collection data. Mock `data/lab-orders.json` has specimen type/condition/department/collection times/collector, but these are not currently mapped or displayed.

## API endpoints/fields that provide data

Base client:
- `src/lib/api/client.ts:3-10` base URL and Authorization header.
- `src/lib/api/client.ts:14-72` refreshes tokens through `/auth/refresh` and redirects to `/login` on auth failure.

Auth:
- `/auth/login` returns access token, refresh token, and user (`src/contexts/AuthContext.tsx:43-57`). User fields: id, email, role, optional patientId/practitionerId, name (`AuthContext.tsx:6-13`).

Patients:
- `GET /patients?search=` returns FHIR Patient list, mapped by `mapFhirPatient` (`src/lib/api/patients.ts:5-9`).
- `GET /patients/{id}` returns one FHIR Patient (`src/lib/api/patients.ts:11-18`).
- `GET /patients/code/{code}` (`src/lib/api/patients.ts:20-27`).
- `GET /patients/{patientId}/allergies` and `/conditions` exist (`src/lib/api/patients.ts:29-36`) but are not used by current UI.
- Patient FHIR fields mapped: identifiers for patient code and NIC; name; gender; birthDate; telecom phone/email; address; contact/emergency contact; extensions for blood type, nationality, marital status; meta lastUpdated (`src/lib/api/mappers.ts:7-33`, `:139-183`).

Lab orders:
- `GET /orders` with optional `status` and `patientId` (`src/lib/api/lab.ts:7-10`).
- `GET /orders/{id}` (`src/lib/api/lab.ts:12-19`).
- `PUT /orders/{id}/receive` (`src/lib/api/lab.ts:25-27`).
- `POST /orders/scan` with `qrData` (`src/lib/api/lab.ts:29-32`).
- FHIR ServiceRequest mapped fields: status, priority, subject.patientId, requester.doctorId, encounterId, note->notesToLab, code.coding[]->tests, meta.lastUpdated->createdAt/sentToLabAt (`src/lib/api/mappers.ts:98-108`, `:333-366`).

Lab results/reports:
- `POST /results` accepts `{ orderId, results, conclusion }` and returns LabResult (`src/lib/api/lab.ts:56-62`). Current UI has demo-only save/submit and does not call this endpoint.
- `GET /reports?orderId=` returns results for an order (`src/lib/api/lab.ts:65-67`).
- `GET /reports?patientId=` returns results for a patient (`src/lib/api/lab.ts:70-72`).
- Result fields visible in API type: result id, orderId, patientId, performedAt, reportedAt, `results[]` with testCode/testName/value/unit/referenceRange/flag, conclusion, status (`src/lib/api/lab.ts:34-53`).

Instruments:
- `GET /instruments` (`src/lib/api/lab.ts:88-91`).
- `PUT /instruments/{id}/status` (`src/lib/api/lab.ts:93-96`).

Notifications:
- `GET /notifications/count` (`src/lib/api/notifications.ts:3-9`), not patient-specific in visible inspected code.

Static/catalog and stubs:
- `getLabTestCatalog()` returns static JSON `src/data/lab-tests.json` via `src/lib/data/api.ts:19-23`.
- `getUrgentLabOrders()`, `getQCLogs()`, and `getLabStaff()` are stubs returning `[]` in `src/lib/data/api.ts:25-27`.

## caveats/unknowns

- Local `data/*.json` files contain richer mock patient/order/result/staff/QC fields than the current API-backed frontend displays. Because `src/lib/data/api.ts:1-18` re-exports live API methods and stubs removed functionality, the mock patient/order/result/staff files appear legacy or unused in current routes, except static test catalog.
- The current UI may display more/less data depending on backend FHIR payloads. For example, `notesToLab` comes from `ServiceRequest.note[0].text`; if the backend puts clinical notes there, they become visible on order detail.
- The frontend does not enforce lab-specific roles client-side; it only requires authentication. Backend authorization may restrict patient/order endpoints, but that is outside this frontend-only inspection.
- There are type/mapping definitions for appointments, encounters, prescriptions, allergies, and conditions, but no inspected lab route imports or renders them. They should be treated as available/shared code, not currently visible lab-user data.
- No patient documents/files, insurance, claims, invoices, or payment endpoints/screens were found in the lab frontend.
