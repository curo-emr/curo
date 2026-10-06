# Curo Pharmacy frontend: patient-related data visible to pharmacy users

## Role/frontend summary

- Frontend analyzed: `/Users/admin/Developer/curo/curo-pharmacy`, a Next.js pharmacy portal. Sidebar labels it **Pharmacy Portal** and exposes Dashboard, Prescriptions, Patients, Inventory, Dispensing Log, Reports, Settings (`src/components/layout/Sidebar.tsx:19-26`, `:35-40`).
- Dashboard routes are guarded only by presence of an authenticated user (`ProtectedRoute`), not by an explicit pharmacy-role check in the frontend. The auth user model includes `role`, `patientId`, `practitionerId`, and `name` (`src/contexts/AuthContext.tsx:7-14`), and login stores the backend-returned user/tokens (`:50-62`).
- API base defaults to `NEXT_PUBLIC_API_URL` or `http://localhost:3000`; bearer token is attached from localStorage (`src/lib/api/client.ts:3-15`).
- Current source code fetches live backend APIs. `src/lib/data/api.ts:1-21` says old data access now re-exports backend API calls and `getPharmacyStaff()`/`getPrescriptionById()` are stubs.

## User-facing screens/features showing patient-related data

### Global topbar search
- `Topbar` search placeholder: “Search by patient, MRN, NIC...” and redirects to `/patients?q=...` (`src/components/layout/Topbar.tsx:26-31`, `:40-48`).

### `/dashboard` — Pharmacy Dashboard
- Fetches pending prescriptions, all patients, stock, and dispensing records (`src/app/(dashboard)/dashboard/page.tsx:22-29`).
- Shows `PendingPrescriptionsList` with prescription ID, status, patient name, medication item names, and link to prescription detail (`src/components/features/dashboard/PendingPrescriptionsList.tsx:16-19`, `:39-56`).
- Shows `RecentDispensingFeed` with prescription ID, patient name, dispense date, item count, and total amount (`src/components/features/dashboard/RecentDispensingFeed.tsx:12-15`, `:30-41`).
- Shows aggregate counts: Total Patients, Total Prescriptions, Dispensing Records (`src/app/(dashboard)/dashboard/page.tsx:101-126`).
- Also shows inventory low/expiring medication data; not patient-specific unless combined with dispensing/prescription references (`src/app/(dashboard)/dashboard/page.tsx:41-45`, `:67-99`).

### `/patients` — Patient Directory
- Fetches all patients plus pending prescriptions (`src/app/(dashboard)/patients/page.tsx:15-17`).
- UI purpose text says “Look up patients and view prescription history” (`src/app/(dashboard)/patients/page.tsx:24-26`).
- `PatientList` supports searching by name, MRN, NIC, or phone (`src/components/features/patients/PatientList.tsx:31-40`, `:56-59`).
- Table columns/values: patient name and MRN, age/sex, allergies, last prescription date, total Rx count (`src/components/features/patients/PatientList.tsx:73-115`).

### `/patients/[patientId]` — Patient Detail
- Fetches patient demographics, prescriptions for that patient, and dispensing records for that patient (`src/app/(dashboard)/patients/[patientId]/page.tsx:25-27`).
- Header displays full name, MRN, age/sex, NIC, blood type, phone, email, allergies, and current medications (`src/app/(dashboard)/patients/[patientId]/page.tsx:49-74`).
- Prescriptions tab displays each Rx ID, status, medication names, prescribed date, and link to Rx detail (`src/app/(dashboard)/patients/[patientId]/page.tsx:82-114`).
- Dispensing History tab displays receipt number, dispensed date/time, dispensed medication names and quantities, dispensed-by identifier, and total amount (`src/app/(dashboard)/patients/[patientId]/page.tsx:122-144`).

### `/prescriptions` — Prescriptions
- Fetches pending prescriptions and all patients (`src/app/(dashboard)/prescriptions/page.tsx:15-17`).
- Search supports Rx ID, patient, or medication; filter by prescription status (`src/components/features/prescriptions/PrescriptionTable.tsx:45-57`, `:66-87`).
- Table displays Rx ID, patient name, medication item names, status, and created date (`src/components/features/prescriptions/PrescriptionTable.tsx:101-123`).

### `/prescriptions/[prescriptionId]` — Prescription detail/dispense
- Current detail page does **not** fetch full Rx or patient detail despite imported unused helpers; comments state no direct `GET /prescriptions/:id`, so it only loads dispensing records by prescription ID (`src/app/(dashboard)/prescriptions/[prescriptionId]/page.tsx:26-35`).
- Displays prescription ID, a dispense action, and any dispensing history: receipt number, dispensed date, medication names, quantities, item subtotals, and total (`src/app/(dashboard)/prescriptions/[prescriptionId]/page.tsx:61-90`, `:95-120`).
- `dispense(prescriptionId)` POST can create a new dispensing record (`src/app/(dashboard)/prescriptions/[prescriptionId]/page.tsx:45-51`; endpoint in `src/lib/api/pharmacy.ts:35-37`).

### `/dispensing-log` — Dispensing Log
- Fetches all dispensing records and all patients (`src/app/(dashboard)/dispensing-log/page.tsx:15-17`).
- Search supports patient, prescription, or medication (`src/components/features/dispensing/DispensingLogTable.tsx:32-40`, `:51-54`).
- Table displays dispensing ID, patient name, prescription ID, medication names and quantities, dispensed-by identifier, date/time, and amount (`src/components/features/dispensing/DispensingLogTable.tsx:70-100`).

### `/reports` — Reports
- Fetches pending prescriptions, stock, and all dispensing records (`src/app/(dashboard)/reports/page.tsx:16-18`).
- Shows aggregate patient-related pharmacy metrics: Total Prescriptions, Total Revenue from dispensing records, Most Dispensed medication, Cancellation Rate, top dispensed medication counts, prescription status distribution (`src/app/(dashboard)/reports/page.tsx:25-40`, `:44-50`, `:80-155`). It does not show patient names/identifiers.

### `/inventory` and `/settings`
- `/inventory` displays stock/medication catalog data (generic/brand/name, form/strength, stock, unit cost, expiry) and is not directly patient-specific (`src/app/(dashboard)/inventory/page.tsx:15-18`; `src/components/features/inventory/MedicationList.tsx:70-100`).
- `/settings` shows pharmacist profile fields (first/last name, role, employee ID, registration, email, phone, address), not patient data (`src/app/(dashboard)/settings/page.tsx:36-90`). This staff/user data can be indirectly linked to patient data through dispensing records’ `dispensedBy` IDs.

## Patient-identifying data

Visible or fetchable via UI/API client:

- Patient internal ID (`Patient.id`) used in routes and joins (`src/types/index.ts:22-24`).
- MRN/patient code (`Patient.mrn`) visible in directory/detail; mapped from FHIR identifier `urn:curo:patient-code` (`src/types/index.ts:22-25`; `src/lib/api/mappers.ts:166`, `:183-185`; visible at `PatientList.tsx:97-98`, detail `page.tsx:50-51`).
- NIC (`Patient.nic`) searchable and displayed on detail (`PatientList.tsx:36-40`; detail `page.tsx:54-58`); mapped from FHIR identifier `urn:curo:nic` (`src/lib/api/mappers.ts:167`, `:183-185`).
- Full/first/last name (`src/types/index.ts:1-4`, `:22-27`); shown in directory, detail, prescription and dispensing views using `getPatientName` (`src/lib/utils.ts:42-44`).
- DOB/age and sex (`src/types/index.ts:27-28`); directory/detail show calculated age and sex (`PatientList.tsx:102-104`; detail `page.tsx:53-55`).
- Phone and email visible on patient detail; phone also searchable (`src/types/index.ts:33-34`; `PatientList.tsx:36-40`; detail `page.tsx:57-58`).
- Address and emergency contact exist in the `Patient` type and FHIR mapper but are not rendered in current pharmacy screens (`src/types/index.ts:7-19`, `:35-36`; mapped at `src/lib/api/mappers.ts:199-210`).
- Nationality, marital status, occupation exist in type/mapper but are not rendered in current pharmacy screens (`src/types/index.ts:30-32`; mapper `src/lib/api/mappers.ts:174-177`, `:193-197`).
- Timestamps `createdAt`/`updatedAt` exist on `Patient`; not directly rendered except prescription dates use prescription `createdAt` (`src/types/index.ts:42-43`; mapper `src/lib/api/mappers.ts:217-218`).

Mock evidence: `data/patients.json` includes id, MRN, NIC, names, DOB, sex, blood type, phone, email, full address, emergency contact, allergies, problem list, current medications, tags, created/updated timestamps (`data/patients.json:3-34`, `:37-68`). These JSON files appear legacy/development data, not active API source per `src/lib/data/api.ts:1-21`.

## Clinical data

- Allergies:
  - `Patient.allergies` is a string array in the type (`src/types/index.ts:38`) and is shown in patient directory and patient detail (`PatientList.tsx:105-110`; detail `page.tsx:60-65`).
  - Separate Allergy API exists (`GET /patients/{patientId}/allergies`) with substance, reaction, severity, notes, recordedAt (`src/lib/api/patients.ts:29-31`; type `src/types/index.ts:46-54`; mapper `src/lib/api/mappers.ts:222-239`). This API is not called by current pharmacy screens.
- Blood type: visible on patient detail (`src/app/(dashboard)/patients/[patientId]/page.tsx:55-57`); type field `Patient.bloodType` (`src/types/index.ts:29`), mapped from `urn:curo:bloodType` (`src/lib/api/mappers.ts:174`, `:193`).
- Problem list/conditions:
  - `Patient.problemList` exists (`src/types/index.ts:39`) and mock patients include conditions (`data/patients.json:29-31`, `:63-65`), but current live FHIR patient mapper sets `problemList: []` (`src/lib/api/mappers.ts:213-215`) and screens do not render it.
  - Separate Conditions API exists (`GET /patients/{patientId}/conditions`) exposing ICD code, name, status, onset date, notes (`src/lib/api/patients.ts:34-36`; type `src/types/index.ts:56-64`; mapper `src/lib/api/mappers.ts:242-259`), but current pharmacy screens do not call it.
- Current medications: `Patient.currentMedications` exists and detail page displays it if populated (`src/types/index.ts:40`; detail `page.tsx:68-73`). However live FHIR mapper currently initializes it to `[]` (`src/lib/api/mappers.ts:213-215`), while mock patients include values (`data/patients.json:29-31`, `:63-65`).
- Prescription clinical notes/diagnosis appear in legacy mock data (`data/prescriptions.json:13-15`, `:52-54`) but are not in the current live `Prescription` type (`src/types/index.ts:192-201`) or rendered in pharmacy screens. Live `notesToPharmacy` is mapped from FHIR note (`src/lib/api/mappers.ts:367`) but not displayed in the current table/detail components.
- Encounter/SOAP clinical data types/mappers exist but are not wired to visible pharmacy screens: encounter has chief complaint and SOAP subjective/objective/assessment/plan (`src/types/index.ts:79-96`; mapper `src/lib/api/mappers.ts:309-330`).

## Appointment/encounter data

- `Appointment` type includes id, date, time, doctorId, patientId, reason, visitType, status, room, notes (`src/types/index.ts:66-77`). FHIR mapper reads appointment start time, participants, reason/description, service type, and comment (`src/lib/api/mappers.ts:274-296`). No pharmacy page imports or calls an appointments API, so appointment data is not currently visible.
- `Encounter` type includes id, patientId, doctorId, appointmentId, status, start/end time, chief complaint, SOAP (`src/types/index.ts:86-96`). FHIR mapper exists (`src/lib/api/mappers.ts:309-330`). No pharmacy page calls an encounters API or renders encounter details.
- Prescriptions carry an `encounterId` and `doctorId` from FHIR MedicationRequest (`src/types/index.ts:192-201`; mapper `src/lib/api/mappers.ts:333-351`), but current screens do not display encounter ID or doctor ID.

## Medication/prescription data

Visible data includes:

- Prescription ID, patient ID/name linkage, encounter ID and doctor ID in data model, status, createdAt/sentAt, pharmacy note (`src/types/index.ts:192-201`; mapper `src/lib/api/mappers.ts:333-368`).
- Medication request item details: medication ID/code, display name, dose, route, frequency, duration days, quantity, instructions (`src/types/index.ts:179-190`; mapper `src/lib/api/mappers.ts:355-365`). Current screens primarily render medication display names, statuses, created dates, and counts (`PrescriptionTable.tsx:101-123`; patient detail `page.tsx:101-109`; dashboard pending list `PendingPrescriptionsList.tsx:43-53`).
- Dispensing records: receipt number, prescription ID, patient ID/name, dispensedBy, dispensedAt, total amount, medication names, quantities, unit prices/subtotals in live `DispenseRecord` (`src/lib/api/pharmacy.ts:19-32`). Shown in patient detail, prescription detail, dispensing log, dashboard recent feed, and reports (`patient detail page.tsx:129-143`; prescription detail `page.tsx:107-119`; `DispensingLogTable.tsx:83-100`; `RecentDispensingFeed.tsx:34-40`; reports `page.tsx:29-40`).
- Legacy/mock dispensing records contain richer item data: prescribed vs dispensed quantities, batch, expiry, substitutions, item notes, counselling notes, printed instructions, verifiedBy (`data/dispensing-records.json:3-35`, `:38-70`). The current live `DispenseRecord` interface does not include all of those fields (`src/lib/api/pharmacy.ts:19-32`), while older `types.DispensingRecord` does (`src/types/index.ts:206-229`).
- Inventory/stock fields visible separately: medicationName, generic/brand name, form, strength, stock quantity/reorder threshold, unit cost, expiry date, batch number; stock APIs are `/stock` and `/stock/alerts` (`src/lib/api/pharmacy.ts:57-81`; `MedicationList.tsx:70-100`).

## Lab data

- No visible lab result screens, lab API calls, or lab hooks were found in `apps/pharmacy/src`.
- `FhirServiceRequest` exists in the mapper with subject/requester/encounter/code/note (`src/lib/api/mappers.ts:130-142`), but it is not mapped/exported to visible lab UI in the pharmacy app. CSS has generic clinical lab color variables, not a data flow.
- Conclusion: no patient lab data is currently visible to pharmacy users in this frontend.

## Billing/insurance/payment data

- Patient insurance exists in the `Patient` type (`src/types/index.ts:37`) but the live FHIR patient mapper always sets `insurance: null` (`src/lib/api/mappers.ts:212`) and no screen displays insurance.
- Payment/revenue visible: dispensing `totalAmount`, item `unitPrice` and `subtotal` in live `DispenseRecord` (`src/lib/api/pharmacy.ts:19-32`). UI shows amounts in patient detail (`page.tsx:141-143`), prescription detail (`page.tsx:113-119`), dispensing log (`DispensingLogTable.tsx:96-100`), dashboard recent feed (`RecentDispensingFeed.tsx:39-40`), and reports total revenue (`reports/page.tsx:29`, `:89-95`).
- No payer, claim, invoice, card/bank details, insurance policy details, or payment method fields were found in current visible pharmacy components.

## Documents/files

- No patient documents, uploads, attachments, scans, files, or download components/API calls were found in `apps/pharmacy/src`.
- The only “FileText” usage is an icon for Dispensing History/Dispensing Log, not actual documents (`src/app/(dashboard)/patients/[patientId]/page.tsx:14`, `:87-88`; Sidebar uses FileText icon for log at `src/components/layout/Sidebar.tsx:13`, `:24`).
- `printedInstructions` exists in legacy/mock and older type data (`data/dispensing-records.json:33-35`; `src/types/index.ts:226-227`) but is not exposed by current live `DispenseRecord` interface or rendered.

## Staff/facility data linked to patients

- Dispensing records link patient-related medication events to staff identifiers: live interface has `dispensedBy` (`src/lib/api/pharmacy.ts:19-24`); older type/mock include `verifiedBy` too (`src/types/index.ts:218-224`; `data/dispensing-records.json:3-8`). UI shows `dispensedBy` as raw value, not staff name, in patient detail and dispensing log (`patient detail page.tsx:141-142`; `DispensingLogTable.tsx:96-98`).
- Prescription data model includes `doctorId` and `encounterId` (`src/types/index.ts:192-201`; mapper `src/lib/api/mappers.ts:333-351`), but current UI does not show prescriber/doctor. Legacy mock prescriptions include `doctorName` and `doctorRegistration` (`data/prescriptions.json:5-8`, `:44-47`).
- Pharmacy staff mock data includes staff name, role, employee ID, email, phone, qualifications, registration number, shift, joined date (`data/pharmacy-staff.json:3-16`, `:19-32`). Current active API shim returns empty staff (`src/lib/data/api.ts:17-18`), and current pages pass `staff={[]}` to the dispensing log (`src/app/(dashboard)/dispensing-log/page.tsx:32`).
- Settings page shows hard-coded pharmacist profile data (Amara Dias, Chief Pharmacist, PH-2018-001, SLPC-5001, email, phone, address) (`src/app/(dashboard)/settings/page.tsx:36-90`).
- Facility/location: no patient-linked facility/ward/room data is visible. Stock items have supplier/location fields in API interface (`src/lib/api/pharmacy.ts:57-72`), not patient-specific. Appointment type has room (`src/types/index.ts:75`) but appointments are not rendered.

## API endpoints/fields that provide patient-related data

Base/API auth:
- `src/lib/api/client.ts:3-15`: base URL and authorization header.

Patient endpoints (`src/lib/api/patients.ts`):
- `GET /patients` with optional `search` param returns `FhirPatient[]`, mapped to `Patient[]` (`:5-8`). Fields mapped include id, MRN/patient code, NIC, name, DOB, sex, blood type, nationality, maritalStatus, occupation, phone, email, address, emergency contact, createdAt/updatedAt (`src/lib/api/mappers.ts:159-218`).
- `GET /patients/{id}` returns one patient (`src/lib/api/patients.ts:11-17`).
- `GET /patients/code/{code}` returns one patient by code (`src/lib/api/patients.ts:20-26`), not used in visible screens.
- `GET /patients/{patientId}/allergies` returns AllergyIntolerance fields: substance, reaction, severity, notes, recordedAt (`src/lib/api/patients.ts:29-31`; mapper `src/lib/api/mappers.ts:222-239`), not used in visible screens.
- `GET /patients/{patientId}/conditions` returns conditions/problems: ICD code, name, status, onset date, notes (`src/lib/api/patients.ts:34-36`; mapper `src/lib/api/mappers.ts:242-259`), not used in visible screens.
- `POST /patients`, `PATCH /patients/{id}`, `POST /patients/{patientId}/allergies` exist (`src/lib/api/patients.ts:39-50`) but current pharmacy screens do not expose create/edit patient/allergy UI.

Pharmacy endpoints (`src/lib/api/pharmacy.ts`):
- `GET /prescriptions/pending` returns FHIR MedicationRequest[] mapped to prescriptions (`:7-9`). Data fields: prescription id, patientId, encounterId, doctorId, status, createdAt/sentAt, medication item display/code/dose/route/frequency/duration/quantity/instructions, notesToPharmacy (`src/lib/api/mappers.ts:333-368`).
- `GET /prescriptions?patientId={id}` returns prescriptions for a patient (`src/lib/api/pharmacy.ts:12-14`).
- `POST /dispense` with `{ prescriptionId }` creates/returns a dispense record (`src/lib/api/pharmacy.ts:35-37`).
- `GET /dispense` returns all dispense records (`src/lib/api/pharmacy.ts:40-42`).
- `GET /dispense?patientId={id}` returns dispense records for patient (`src/lib/api/pharmacy.ts:45-47`).
- `GET /dispense?prescriptionId={id}` returns dispense records by prescription (`src/lib/api/pharmacy.ts:50-52`).
- `GET /stock`, `GET /stock/alerts`, `PUT /stock/{id}`, `POST /stock` provide medication stock/catalog, including medication name/generic/brand/form/strength/quantity/reorder threshold/unit cost/expiry/batch/supplier/location/isActive (`src/lib/api/pharmacy.ts:57-91`).

Other:
- `GET /notifications/count` provides only a notification count (`src/lib/api/notifications.ts:3-9`), not patient data in this frontend.
- `POST /auth/login`/`POST /auth/refresh` return auth user/tokens (`src/contexts/AuthContext.tsx:50-62`; `src/lib/api/client.ts:68-75`).

## Caveats/unknowns

- Important live-mapper caveat: `mapFhirPatient` currently sets `insurance`, `allergies`, `problemList`, `currentMedications`, and `tags` to null/empty values (`src/lib/api/mappers.ts:212-216`). Therefore the UI has placeholders/rendering paths for allergies/current meds, but live data may be empty unless backend FHIR patient embeds/other transformations are added or mocks are used.
- Separate allergies/conditions APIs exist but are not called from current pharmacy screens; visible clinical allergy/problem data may be limited to whatever is embedded on the mapped `Patient`, which currently is empty for live API.
- Prescription detail has incomplete implementation: comments state no direct prescription-by-ID API and it only shows dispensing records by prescription ID (`src/app/(dashboard)/prescriptions/[prescriptionId]/page.tsx:29-35`). It imports patient/prescription utilities but does not use them (`:12-14`, state at `:18-20`).
- Legacy/mock JSON files contain richer fields than current live interfaces: doctor names/registrations, diagnosis, clinical notes, priority, genericAllowed, counselling notes, substitutions, verifiedBy, printedInstructions, full patient problem lists/current meds, staff details, and stock transactions. The source comment in `src/lib/data/api.ts:1-21` indicates these are no longer the active data source.
- No pharmacy frontend evidence was found for patient lab results, documents/files, insurance/payment method details, appointment views, or encounter/SOAP views, despite some types/mappers existing.
- Authorization/role boundaries are backend-dependent from this frontend’s perspective; `ProtectedRoute` only checks for any authenticated user, and no route-level pharmacy permission checks were found in the frontend.
