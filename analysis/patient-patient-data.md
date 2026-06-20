# Curo Patient Frontend: patient-visible patient/dependent data

## role/frontend summary

- Frontend app: `curo-patient`, a Next.js patient portal. Dashboard routes are protected by `ProtectedRoute` in `src/app/(dashboard)/layout.tsx`; unauthenticated users are redirected to `/login`.
- Auth data visible/held client-side: `AuthUser` has `id`, `email`, `role`, optional `patientId`, optional `practitionerId`, and optional `name` (`src/contexts/AuthContext.tsx:7-14`). Login calls `POST /auth/login` and stores tokens plus `curo_user` in `localStorage` (`src/contexts/AuthContext.tsx:50-62`). API requests attach `Authorization: Bearer <token>` (`src/lib/api/client.ts:10-15`).
- Main navigation/screens: Dashboard, Appointments, Visits, Prescriptions, Lab Reports, Health Records, Profile, Settings (`src/components/layout/Sidebar.tsx:15-29`; same nav in MobileSidebar). Routes are defined in `src/lib/constants.ts:7-18`.
- Data source pattern: active pages mostly call backend API functions in `src/lib/api/patient-portal.ts`. `src/lib/data/api.ts:1-9` re-exports those functions and comments that data is now fetched from backend; local mock JSON is mostly not used by pages except lab-test catalog and medication catalog helpers (`src/lib/data/api.ts:17-27`).
- Dependents: I found no route, component, type, API helper, or mock field for dependents/guardians/family members. Searches for `dependent`, `guardian`, and related terms did not reveal user-facing dependent functionality.

## user-facing screens/features

### `/login` — `LoginPage`
- User enters email/password; invalid login message. Evidence: login form fields and `login(email,password)` in `src/app/(auth)/login/page.tsx`; AuthContext endpoint evidence at `src/contexts/AuthContext.tsx:50-62`.
- Patient-related account data exposed after auth is `user.name` in shell components and `user.email`/`patientId` in localStorage (not directly rendered except name). Sidebar shows initials/name (`src/components/layout/Sidebar.tsx:63-72`); Topbar shows `user?.name || "Patient"` (`src/components/layout/Topbar.tsx:11-22`).

### `/dashboard` — `DashboardPage`
- Loads profile, appointments, allergies, conditions, prescriptions, lab orders (`src/app/(dashboard)/dashboard/page.tsx:24-36`).
- Visible data:
  - First name greeting (`patient.name.first`) (`dashboard/page.tsx:66`).
  - Known allergies: substance and severity (`dashboard/page.tsx:69-75`).
  - Counts: upcoming appointments, active conditions, active prescriptions, pending lab results (`dashboard/page.tsx:47-52`, `78-87`).
  - Upcoming appointments: date, time, reason, visit type, status (`dashboard/page.tsx:107-120`).
  - Recent prescriptions: medication display names, created date, item count, link to detail (`dashboard/page.tsx:141-149`).
  - Active conditions: condition name, onset date, ICD code (`dashboard/page.tsx:165-174`).
  - Pending labs: number of tests pending and ordered date (`dashboard/page.tsx:201-203`).

### `/appointments` — `AppointmentsPage`
- Loads all appointments with `getMyAppointments()` (`src/app/(dashboard)/appointments/page.tsx:17-20`).
- Visible upcoming/past appointment data: date, time, reason, status, doctor name placeholder/resolution, visit type, room if present, notes if present (`appointments/page.tsx:62-82`, `116-125`).
- Caveat: `doctors` is hardcoded to an empty array in this page, so doctor names render as `Unknown Doctor` via `getDoctorName` unless changed (`appointments/page.tsx:21`, `src/lib/utils.ts:51-53`).

### `/visits` — `VisitsPage`
- Loads profile, then encounters for that patient and practitioners (`src/app/(dashboard)/visits/page.tsx:24-31`).
- Visible completed encounter data: chief complaint, encounter status, doctor name, visit/started date, counts of diagnoses/prescriptions/lab orders if arrays are non-empty (`visits/page.tsx:74-100`).
- `/visits/[visitId]` currently does **not** fetch detail data; it shows a static message: “Visit detail records are available to your care team. Contact your clinic for a full copy of your visit notes.” (`src/app/(dashboard)/visits/[visitId]/page.tsx:16-30`).
- Caveat: API mapper currently discards diagnosis arrays, prescription IDs, lab order IDs, vitals, and audit IDs from FHIR encounters by setting them empty (`src/lib/api/mappers.ts:336-346`), so visit list counts are likely always zero unless mapper changes.

### `/prescriptions` — `PrescriptionsPage`
- Loads profile, then prescriptions for the patient (`src/app/(dashboard)/prescriptions/page.tsx:20-25`).
- Visible prescription list data: medication display names, doctor name placeholder/resolution, prescription created date, item/medication count, status (`prescriptions/page.tsx:58-81`).
- Caveat: `doctors` is hardcoded empty here too, so doctor names render `Unknown Doctor` (`prescriptions/page.tsx:29`).

### `/prescriptions/[prescriptionId]` — `PrescriptionDetailPage`
- Loads profile, all prescriptions, then filters by route ID (`src/app/(dashboard)/prescriptions/[prescriptionId]/page.tsx:24-31`).
- Visible prescription detail data: doctor name placeholder/resolution, created date, status, medication display name, dose, route, frequency, duration days, quantity, patient instructions, substitutes display names, notes to pharmacy (`prescriptions/[prescriptionId]/page.tsx:55-67`, `81-120`, `130-139`).

### `/lab-reports` — `LabReportsPage`
- Loads profile, lab orders for patient, and local lab-test catalog (`src/app/(dashboard)/lab-reports/page.tsx:20-25`).
- Visible pending lab data: ordered-by doctor name placeholder/resolution, ordered date, lab order status, priority if non-routine, test names/codes, “Awaiting results” (`lab-reports/page.tsx:60-83`).
- Visible completed lab data: ordered-by doctor, created date, reviewed date if present, status, test names/codes, result value or “No result” (`lab-reports/page.tsx:113-139`).
- Caveat: ServiceRequest mapper sets each test result to `null` and `showResultsToPatient` to `false` (`src/lib/api/mappers.ts:410-416`), but the page still displays completed labs/results if `test.result` exists in the mapped data shape. With current FHIR mapper, result values are not populated from API.

### `/health-records` — `HealthRecordsPage`
- Loads profile, allergies, conditions, prescriptions (`src/app/(dashboard)/health-records/page.tsx:32-41`).
- Visible allergies: substance, severity, reaction, notes, recorded date (`health-records/page.tsx:81-97`).
- Visible active conditions: condition name, ICD code, onset date, notes, active badge (`health-records/page.tsx:127-139`).
- Visible resolved/inactive conditions: condition name, ICD code, onset date, status (`health-records/page.tsx:155-168`).
- Visible current medications: from the first prescription only (`latestRx = prescriptions[0]`), display name, dose, route, frequency, instructions (`health-records/page.tsx:45-47`, `187-196`).

### `/profile` — `ProfilePage`
- Loads profile via `getMyProfile()` (`src/app/(dashboard)/profile/page.tsx:17-19`).
- Visible patient data:
  - Overview: initials, full name, MRN, age, DOB, sex, blood type (`profile/page.tsx:36-50`).
  - Personal info: NIC, nationality, marital status, occupation, DOB, sex, blood type (`profile/page.tsx:61-96`).
  - Contact info: phone, email, address line1/line2/city/district/postal code/country (`profile/page.tsx:103-128`).
  - Emergency contact: name, relationship, phone (`profile/page.tsx:135-148`).
  - Insurance if present: provider, policy number, group number, holder name/relationship, expiry (`profile/page.tsx:152-177`).
  - Account metadata: patient since/createdAt and last updated/updatedAt (`profile/page.tsx:184-189`).

### `/settings` — `SettingsPage`
- Static UI, not wired to AuthContext or profile API.
- Visible hardcoded patient-like sample data: initials `NP`, first name `Nimal`, last name `Perera`, email `nimal.perera@example.com`, phone `+94 77 123 4567` (`src/app/(dashboard)/settings/page.tsx:38-66`).
- Also shows password fields and notification placeholder; “Change Photo”, “Save Changes”, “Update Password” buttons are UI-only in the inspected file.

## patient-identifying data

User-visible/self-identifying fields found:

- Auth/account: auth user `id`, `email`, `role`, optional `patientId`, optional `practitionerId`, optional `name` in client localStorage (`src/contexts/AuthContext.tsx:7-14`, `36-62`). Rendered shell name/initials in Sidebar and Topbar (`src/components/layout/Sidebar.tsx:63-72`, `src/components/layout/Topbar.tsx:11-22`).
- Profile type fields: `id`, `mrn`, `nic`, `name.first`, `name.last`, `name.full`, `dob`, `sex`, `bloodType`, `nationality`, `maritalStatus`, `occupation`, `phone`, `email`, full address, emergency contact, insurance, `createdAt`, `updatedAt` (`src/types/index.ts:31-53`).
- Profile mapper sources: FHIR Patient `id`, identifiers (`urn:curo:patient-code`, `urn:curo:nic`), name, gender, birthDate, telecom phone/email, address, contact, extensions for blood type/nationality/occupation/marital status (`src/lib/api/mappers.ts:20-47`, `171-230`).
- Visible Profile screen evidence listed above (`profile/page.tsx:36-189`).
- Mock patient examples include MRN, NIC, full demographics, contact info, emergency contact, insurance, tags (`data/patients.json`, first record includes Nimal Perera and related identifiers). Local mock patients are not actively used by current pages per `src/lib/data/api.ts:1-9`.

## clinical data

- Allergies:
  - Type fields: `patientId`, `substance`, `reaction`, `severity`, `notes`, `recordedAt` (`src/types/index.ts:55-63`).
  - FHIR source: AllergyIntolerance code/reaction/criticality/note/recordedDate (`src/lib/api/mappers.ts:49-59`, mapped in `mapFhirAllergy`).
  - Visible on Dashboard and Health Records: Dashboard shows substance/severity; Health Records shows substance, severity, reaction, notes, recorded date (`dashboard/page.tsx:69-75`, `health-records/page.tsx:81-97`).
- Conditions/problems:
  - Type fields: `patientId`, `icdCode`, `name`, `status`, `onsetDate`, `notes` (`src/types/index.ts:65-73`).
  - FHIR source: Condition code, clinicalStatus, onsetDateTime, note (`src/lib/api/mappers.ts:61-70`).
  - Visible on Dashboard and Health Records: active conditions and resolved/inactive conditions with names, ICD codes, onset dates, notes/status (`dashboard/page.tsx:165-174`, `health-records/page.tsx:127-168`).
- Encounter clinical detail type exists: SOAP subjective/objective/assessment/plan, vitals, diagnoses (`src/types/index.ts:88-127`). Mapper reads chief complaint and SOAP extensions (`src/lib/api/mappers.ts:321-341`) but sets vitals/diagnoses empty (`mappers.ts:342-346`). The detail page intentionally withholds visit notes (`visits/[visitId]/page.tsx:16-30`).
- Mock encounter JSON contains richer clinical data (SOAP, vitals, diagnosis, chief complaint), but current FHIR mapper/page do not surface most of it. Example first encounter in `data/encounters.json` has chief complaint, SOAP, vitals, diagnosis, prescription/lab links.

## appointment/encounter data

- Appointment type fields: `id`, `date`, `time`, `doctorId`, `patientId`, `reason`, `visitType`, `status`, `room`, `notes` (`src/types/index.ts:75-86`).
- Appointment endpoint: `GET /appointments` (`src/lib/api/patient-portal.ts:14-16`). FHIR Appointment source includes status/start/end/serviceType/reasonCode/description/comment/participants/extensions (`src/lib/api/mappers.ts:72-93`), mapped to date/time/doctorId/patientId/reason/visitType/status/notes (`mappers.ts:286-308`).
- Visible appointment data: `/dashboard` upcoming summary (`dashboard/page.tsx:107-120`) and `/appointments` upcoming/past list with date/time/reason/status/doctor/visit type/room/notes (`appointments/page.tsx:62-82`, `116-125`).
- Encounter type fields: `id`, `patientId`, `doctorId`, `appointmentId`, `status`, `startedAt`, `endedAt`, `chiefComplaint`, `soap`, `vitals`, `diagnoses`, `prescriptionIds`, `labOrderIds`, `auditTrailIds` (`src/types/index.ts:112-127`).
- Encounter endpoint: `GET /encounters/patient/{patientId}` (`src/lib/api/patient-portal.ts:39-41`). FHIR Encounter source includes subject, participant, appointment, period, reasonCode, extensions (`src/lib/api/mappers.ts:95-109`).
- Visible encounter data: `/visits` shows completed visits with chief complaint, status, doctor, started date, and related-count summaries if populated (`visits/page.tsx:74-100`). Detail page withholds details.

## medication/prescription data

- Prescription type fields: prescription `id`, `patientId`, `encounterId`, `doctorId`, `status`, `createdAt`, `sentAt`, `notesToPharmacy`; item `medicationId`, `displayName`, `dose`, `route`, `frequency`, `durationDays`, `quantity`, `instructions`, substitute `medicationId/displayName/notes` (`src/types/index.ts:139-168`).
- Medication catalog type exists with name/genericName/form/strength/ATC/substitutes (`src/types/index.ts:129-137`), and `getMedicationCatalog()` reads `data/medications.json` (`src/lib/data/api.ts:17-27`), but I did not find a current patient-facing page using it.
- Endpoint: `GET /prescriptions?patientId={patientId}` (`src/lib/api/patient-portal.ts:29-31`). FHIR MedicationRequest source includes subject/requester/encounter, medicationCodeableConcept, dosageInstruction, dispenseRequest, note, extension (`src/lib/api/mappers.ts:111-140`). Mapper emits medication display name/code, dose, route, frequency, duration days, quantity, instructions, notes to pharmacy (`mappers.ts:350-385`).
- Visible list/detail data: `/dashboard` recent prescriptions (`dashboard/page.tsx:141-149`), `/prescriptions` list (`prescriptions/page.tsx:58-81`), `/prescriptions/[prescriptionId]` detail (`prescriptions/[prescriptionId]/page.tsx:55-139`), and `/health-records` “Current Medications” from latest prescription only (`health-records/page.tsx:45-47`, `187-196`).

## lab data

- Lab order type fields: `id`, `patientId`, `encounterId`, `doctorId`, `priority`, `status`, `createdAt`, `sentToLabAt`, `notesToLab`, tests (`testId`, `status`, `result`), review (`isReviewed`, `reviewedAt`, `reviewedBy`), `showResultsToPatient` (`src/types/index.ts:177-202`). Lab test catalog fields: `id`, `code`, `name`, `category` (`src/types/index.ts:170-175`).
- Endpoint: `GET /lab-orders?patientId={patientId}` (`src/lib/api/patient-portal.ts:34-36`). FHIR ServiceRequest source includes status, priority, subject, requester, encounter, code, note, extension (`src/lib/api/mappers.ts:142-154`). Mapper emits order IDs/dates/status/priority/notes and test IDs, but sets results null and showResultsToPatient false (`mappers.ts:388-417`).
- Lab test names/codes are from local `data/lab-tests.json` via `getLabTestCatalog()` (`src/lib/data/api.ts:17-23`).
- Visible lab data: Dashboard pending count and ordered date (`dashboard/page.tsx:201-203`); Lab Reports pending order/test names and completed order/review/test result UI (`lab-reports/page.tsx:60-83`, `113-139`).
- Mock `data/lab-orders.json` contains results and `showResultsToPatient: true` in examples, but current active API path does not use that file.

## billing/insurance/payment data

- Insurance type: provider, policy number, group number, expiry date, holder name, relationship (`src/types/index.ts:22-29`) and optional on Patient (`src/types/index.ts:46`).
- Profile screen renders insurance fields if `patient.insurance` exists (`src/app/(dashboard)/profile/page.tsx:152-177`).
- Current FHIR patient mapper explicitly sets `insurance: undefined` (`src/lib/api/mappers.ts:224`), so backend `/patients/me` data will not currently produce visible insurance unless mapper is changed or patient object is otherwise populated.
- Mock `data/patients.json` contains insurance details for sample patients. No current page/API helper for bills, invoices, balances, claims, copays, cards, or payments found. Search for billing/payment/document terms found no dedicated billing/payment route.

## documents/files

- No patient-facing documents/files/downloads route or API helper found.
- Only file-related UI found is generic `components/ui/input.tsx` styling for file inputs and a static “Change Photo” button on Settings (`src/app/(dashboard)/settings/page.tsx:38-42`), with no upload handler/API.
- Visit detail page tells patients to contact clinic for a full copy of visit notes rather than presenting documents (`src/app/(dashboard)/visits/[visitId]/page.tsx:22-30`).

## staff/facility data linked to patients

- Doctor/practitioner IDs are part of Appointment, Encounter, Prescription, and LabOrder types (`src/types/index.ts:79`, `115`, `162`, `193`).
- Practitioner lookup endpoint: `GET /auth/practitioners?role=DOCTOR`, returns `{ id, name.full }` only in this frontend helper (`src/lib/api/patient-portal.ts:44-51`). Used by Visits page (`src/app/(dashboard)/visits/page.tsx:27-31`), so visit list can show doctor names.
- Other screens often create `doctors = []`, so doctor-linked rows display `Unknown Doctor` via `getDoctorName` (`src/lib/utils.ts:51-53`): Appointments (`appointments/page.tsx:21`), Prescriptions list (`prescriptions/page.tsx:29`), Prescription detail (`prescriptions/[prescriptionId]/page.tsx:39`), Lab Reports (`lab-reports/page.tsx:29`).
- Doctor type and mock doctors include fuller staff/facility-like data: specialty, phone, email, roomNumber, availableDays, slotDurationMinutes, workingHours (`src/types/index.ts:204-214`; `data/doctors.json`). Current patient screens do not actively use that mock doctor data.
- Facility/room data: Appointment type has `room` and appointment page displays room if present (`src/types/index.ts:84`, `appointments/page.tsx:74-78`), but FHIR mapper sets `room: ''` (`src/lib/api/mappers.ts:306`). Mock `data/appointments.json` includes room values.

## API endpoints/fields that provide data

- Base URL: `NEXT_PUBLIC_API_URL` or `http://localhost:3000` (`src/lib/api/client.ts:3-7`). Auth bearer token added from `localStorage` (`client.ts:10-15`). Token refresh endpoint: `POST /auth/refresh` (`client.ts:68-72`).
- `POST /auth/login`: returns `accessToken`, `refreshToken`, `user` (`id`, `email`, `role`, `patientId`, `practitionerId`, `name`) (`src/contexts/AuthContext.tsx:7-14`, `50-62`).
- `GET /patients/me`: FHIR Patient -> Patient profile. Fields consumed: FHIR id, identifier systems `urn:curo:patient-code` and `urn:curo:nic`, name, gender, birthDate, telecom phone/email, address, contact emergency contact, extensions `urn:curo:bloodType`, `urn:curo:nationality`, `urn:curo:occupation`, `urn:curo:maritalStatus`, `meta.lastUpdated` (`src/lib/api/patient-portal.ts:5-12`; `src/lib/api/mappers.ts:20-47`, `171-230`).
- `GET /appointments`: FHIR Appointment[] -> Appointment[]. Fields consumed: status, start, serviceType coding code, reasonCode text or description, comment, participant Patient/Practitioner references (`patient-portal.ts:14-17`; `mappers.ts:72-93`, `286-308`).
- `GET /patients/{patientId}/allergies`: FHIR AllergyIntolerance[] -> Allergy[]. Fields consumed: code text/display, reaction manifestation text, criticality, note text, recordedDate/meta (`patient-portal.ts:19-22`; `mappers.ts:49-59`).
- `GET /patients/{patientId}/conditions`: FHIR Condition[] -> Problem[]. Fields consumed: code text/coding code/display, clinicalStatus coding code, onsetDateTime, note text (`patient-portal.ts:24-27`; `mappers.ts:61-70`).
- `GET /prescriptions?patientId={patientId}`: FHIR MedicationRequest[] -> Prescription[]. Fields consumed: subject/requester/encounter references, medication code/text/display, dosage text/timing/route/dose quantity, dispense quantity, notes, extension `urn:curo:durationDays`, meta.lastUpdated (`patient-portal.ts:29-31`; `mappers.ts:111-140`, `350-385`).
- `GET /lab-orders?patientId={patientId}`: FHIR ServiceRequest[] -> LabOrder[]. Fields consumed: subject/requester/encounter references, status, priority, code codings as tests, note, meta.lastUpdated (`patient-portal.ts:34-36`; `mappers.ts:142-154`, `388-417`).
- `GET /encounters/patient/{patientId}`: FHIR Encounter[] -> Encounter[]. Fields consumed: subject, participant practitioner, appointment, period start/end, reasonCode, extensions `urn:curo:chiefComplaint` and `urn:curo:soap:*` (`patient-portal.ts:39-41`; `mappers.ts:95-109`, `321-347`).
- `GET /auth/practitioners?role=DOCTOR`: practitioner list for names only (`patient-portal.ts:44-51`).
- Local static data used: `data/lab-tests.json` through `getLabTestCatalog()` for test names/codes (`src/lib/data/api.ts:17-23`). `data/medications.json` has a helper but appears unused by current pages (`data/api.ts:25-27`). Other mock JSON files exist (`patients`, `appointments`, `allergies`, `problems`, `encounters`, `prescriptions`, `lab-orders`, `doctors`) but current API re-export comment says data now comes from backend (`data/api.ts:1-9`).

## caveats/unknowns

- No source files were modified; this report is the only written artifact.
- Backend authorization/scoping was not inspected here. Frontend calls `/appointments` without a patientId and assumes backend returns only the logged-in patient’s appointments. Other calls use profile `pt.id` as patientId.
- Dependents: none found in frontend. If dependents exist in backend, this frontend does not appear to expose them.
- Insurance: type/UI/mock support exists, but current FHIR mapper sets insurance undefined, so real API profiles likely do not show insurance in the current frontend.
- Lab results: UI can render completed lab results, and mocks contain results, but current ServiceRequest mapper does not populate result values and defaults `showResultsToPatient` false.
- Encounter details: type and mapper include SOAP fields, but detail page does not fetch/show them; list shows only chief complaint/date/doctor/status and related-count summaries. Vitals/diagnoses are not populated by current mapper.
- Doctor names/facility details are inconsistent: only Visits calls `getPractitioners`; other screens pass empty doctor lists. Room is displayed only if present, but current FHIR appointment mapper sets room empty.
- Settings page contains hardcoded sample patient info unrelated to live auth/profile data.
