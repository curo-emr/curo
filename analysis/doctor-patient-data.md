# Doctor frontend patient-related data inventory

## Role/frontend summary

- Frontend inspected: `/Users/admin/Developer/curo/curo-doctor`, a Next.js doctor-facing app with protected dashboard routes for dashboard, schedule, patient directory, patient chart, registration/edit, and encounters.
- Patient data is primarily loaded from backend API clients under `src/lib/api/*` and mapped from FHIR-like resources in `src/lib/api/mappers.ts`. Static JSON data under `data/` still exists and contains mock PHI-like records, but `src/lib/data/api.ts` states patient/appointment/encounter/clinical data is now fetched from the backend and only catalogs are bundled locally.
- Core typed data model shows the frontend can represent patient demographics/identity, contact/address/emergency contact, insurance, allergies/problems, appointments, SOAP encounters/vitals/diagnoses, prescriptions, labs, and patient-linked tasks (`src/types/index.ts:31-220`).

## User-facing screens/features

- **Dashboard** (`/dashboard`, `src/app/(dashboard)/dashboard/page.tsx`): loads today’s appointments, open tasks, and all patients (`lines 26-35`). Shows visit counts (`lines 54-58`), today’s schedule with patient name, age/sex, visit type, reason, room, appointment status, Open Chart and Start/Resume Visit actions (`lines 106-143`), plus a sidebar with tasks and recent patients (`line 155`).
- **Schedule** (`/schedule`, `src/app/(dashboard)/schedule/page.tsx`, `ScheduleClient`): loads all appointments and patients; appointment cards show time/status, patient name, age/sex, visit type, room, reason, and Start/Resume Visit/Chart actions (`src/components/features/patients? no; src/app/(dashboard)/schedule/ScheduleClient.tsx:61-123`, actions at `127-130+`).
- **Patient Directory** (`/patients`, `src/app/(dashboard)/patients/page.tsx`, `PatientList`): searchable/filterable table. Search terms include name, MRN, phone, tags; sex filter (`src/components/features/patients/PatientList.tsx:39-49`, UI `67-89`). Table shows patient name, MRN, age/sex, phone, allergies, last seen (`lines 117-151`, allergy tooltip `153-174`).
- **Patient Chart** (`/patients/[patientId]`, `src/app/(dashboard)/patients/[patientId]/page.tsx`): fetches patient, allergies, conditions/problems, encounters, lab orders, prescriptions, and lab catalog in parallel (`lines 28-36`) and passes them to `PatientHeader` and `PatientChartTabs` (`lines 67-77`).
- **Patient Header** (`PatientHeader`): displays name, MRN, sex, age/DOB, blood type, phone, city, tags, allergies alert, emergency contact, and links to edit demographics/start visit (`src/components/features/patients/PatientHeader.tsx:29-38`, tags `41-49`, allergies `70-78`, emergency contact `83-101`).
- **Patient Chart Tabs** (`PatientChartTabs` and tabs):
  - Overview: active problems, current medication count, recent encounters/chief complaint (`OverviewTab.tsx:31-38`, `53-59`, `78-85`).
  - Encounters: encounter date/status/chief complaint/diagnosis badges (`EncountersTab.tsx`).
  - Problems: problem name, status, ICD-10, onset, notes (`ProblemsTab.tsx:18-29`).
  - Allergies: substance, severity, reaction, recorded date, notes (`AllergiesTab.tsx:19-35`).
  - Medications: prescription date, medication, directions, status (`MedicationsTab.tsx:24-53`).
  - Labs & Reports: lab order date, priority, status, notes to lab, tests/status, review button/reviewed state (`LabsTab.tsx:25-63`).
- **Register/Edit Patient** (`/patients/new`, `/patients/[patientId]/edit`, `PatientRegistrationForm`, `PatientEditForm`): forms collect/edit demographics, contacts, emergency contact, optional insurance UI fields, allergy UI fields, tags. Validation schema includes these fields (`src/lib/validations/patient.ts`). Actions currently submit only demographics/contact/emergency contact (see caveats).
- **New Encounter / Start Visit** (`/patients/[patientId]/encounters/new`, `EncounterEditor`): shows patient name/MRN and captures chief complaint, SOAP note, vitals/BMI, diagnoses, prescriptions, lab orders/priority/notes/show-results flag (`EncounterEditor.tsx:45-54`, save payloads `69-128`).
- **Encounter Details** (`/patients/[patientId]/encounters/[encounterId]`): displays patient name, encounter date/status, SOAP note, diagnoses, vitals/BMI, encounter-specific prescriptions and lab orders.
- **ICD Search** (`/icd`): displays only static ICD-10 catalog codes/descriptions/keywords, not patient-specific data.
- **Settings** (`/settings`): doctor profile/contact/facility information, not patient-specific.

## Patient-identifying data

- Types include patient `id`, MRN, name first/last/full, DOB, sex, phone, email, address line/city/district/postal/country, emergency contact, tags, NIC/passport, nationality, marital status, occupation, insurance (`src/types/index.ts:31-52`).
- FHIR mapper pulls identifiers from `urn:curo:patient-code` and `urn:curo:nic`, name, gender, birthDate, telecom phone/email, address, extensions for blood type/nationality/occupation/marital status, emergency contact (`src/lib/api/mappers.ts:159-218`).
- Visible in:
  - Patient directory: name, MRN, age/sex, phone, last seen (`PatientList.tsx:117-151`); search by name/MRN/phone/tags (`lines 39-47`).
  - Patient header/chart: name, MRN, sex, age/DOB, phone, city, tags, emergency contact name/relationship/phone (`PatientHeader.tsx:29-38`, `41-49`, `83-101`).
  - Dashboard/Schedule: patient name, age/sex, appointment metadata (`dashboard/page.tsx:116-123`; `ScheduleClient.tsx:106-123`).
  - New/edit forms: NIC/passport, first/last name, DOB, sex, nationality, marital status, occupation, phone, email, address fields, emergency contact, tags, insurance UI fields (forms and schema).
- Mock evidence: `data/patients.json` includes full names, MRNs, DOB/sex, blood type, phone/email/address, emergency contacts, tags, current medication/problem/allergy IDs.

## Clinical data

- Allergies: substance, reaction, severity, notes, recorded date (`src/types/index.ts:55-63`); mapped from FHIR AllergyIntolerance code/reaction/criticality/note/recordedDate (`mappers.ts:222-239`); visible in header alert (`PatientHeader.tsx:70-78`), directory tooltip (`PatientList.tsx:153-174`), Allergies tab (`AllergiesTab.tsx:19-35`), registration/edit allergy UI.
- Problems/conditions: patientId, ICD-10 code, name, active/resolved/inactive status, onset date, notes (`types/index.ts:65-73`); mapped from FHIR Condition (`mappers.ts:242-259`); visible in Overview active problems (`OverviewTab.tsx:31-38`) and Problems tab (`ProblemsTab.tsx:18-29`).
- Encounters: chief complaint, SOAP subjective/objective/assessment/plan, vitals, diagnoses, status, dates, IDs (`types/index.ts:88-127`). Encounter mapper includes chief complaint/SOAP from extensions/reasonCode but currently maps vitals/diagnoses empty from the FHIR encounter itself (`mappers.ts:309-335`).
- New visit capture: chief complaint and SOAP note fields (`ClinicalNotes.tsx:10-14`, `33-47`), diagnoses via ICD search, vitals fields and BMI (`VitalsPanel.tsx:11-19`, `27-75`), and save payloads to encounter/notes/vitals/prescriptions/lab orders (`EncounterEditor.tsx:69-128`).
- Mock evidence: `data/encounters.json` contains chief complaints, SOAP notes, vitals, diagnoses, prescriptions/lab IDs, and status.

## Appointment/encounter data

- Appointment model: id, date, time, doctorId, patientId, reason, visitType, status, room, notes (`src/types/index.ts:75-86`). FHIR appointment mapper returns date/time, patientId/practitionerId, reason, visitType, status, notes/comment; room is blank from live FHIR mapper (`mappers.ts:274-296`).
- Dashboard and Schedule show appointment time/status, patient name, age/sex, visit type, reason, room (if present), and start/resume/chart actions (`dashboard/page.tsx:106-143`; `ScheduleClient.tsx:84-123`).
- Encounter model and details include encounter id, patient/doctor/appointment links, status, startedAt/endedAt, chief complaint, SOAP, vitals, diagnoses, prescription/lab IDs/auditTrailIds (`types/index.ts:112-127`).
- Encounter creation from Start Visit posts patientId, optional appointmentId, reasonCode, periodStart; completion updates status (`EncounterEditor.tsx:69-76`, `127-128`).
- Mock evidence: `data/appointments.json` includes doctorId/patientId/reason/visitType/room/notes/status; `data/encounters.json` includes appointment links and timestamps.

## Medication/prescription data

- Medication catalog type includes id, name, genericName, form, strength, ATC, substitutes (`types/index.ts:135-143`); static catalog read from `data/medications.json` via `src/lib/data/api.ts`.
- Prescription model includes patientId, encounterId, doctorId, status, created/sent dates, items, notesToPharmacy. Items include medicationId/displayName, dose, route, frequency, durationDays, quantity, instructions, substitutes (`types/index.ts:151-173`).
- Medication tab shows prescription date, medication, directions (dose/route/frequency/duration/quantity/instructions), and status (`MedicationsTab.tsx:24-53`). Encounter details also shows status, medication, dose/frequency.
- New encounter e-prescription captures medicine name, dose, frequency, duration days, quantity, instructions; route defaults to `oral` and medicationId is `custom-*` for ad hoc entry (`PrescriptionForm.tsx:16-36`, fields `57-75`, edit fields `99-115`). Save posts medicationCode/display, dosageText, route, frequency, duration, quantity, note (`EncounterEditor.tsx:103-115`).
- FHIR MedicationRequest mapper reads subject/requester/encounter, medication concept, dosage text/timing/route/dose, dispense quantity, duration extension, note (`mappers.ts:338-373`).
- Mock evidence: `data/prescriptions.json` includes Metformin/Amlodipine, dose/route/frequency/duration/quantity/instructions/substitutes/notesToPharmacy.

## Lab data

- Lab order model: patientId, encounterId, doctorId, priority, status, createdAt, sentToLabAt, notesToLab, tests with result, review fields, showResultsToPatient (`types/index.ts:183-208`). Static lab test catalog has id/code/name/category (`types/index.ts:176-180`).
- Labs tab shows order date, urgent priority badge, order status, notes to lab, test display names/status, and review/reviewed UI (`LabsTab.tsx:25-63`). Dashboard sidebar has a pending labs component that would show patient name, urgent flag, count of pending tests, ordered date, Review Results action, but Dashboard currently passes an empty array (`DashboardSidebar.tsx`; dashboard `line 155`).
- New encounter lab order captures free-text test name and specific instructions, priority routine/urgent/stat, clinical notes for lab, and show-results-to-patient checkbox (`LabOrderForm.tsx:19-27`, `40-46`, `59-65`, `86-110`). Save posts one lab order per test with patientId, encounterId, code/display, priority, note (`EncounterEditor.tsx:117-125`); `showResultsToPatient` is held in UI state but not included in the create payload.
- FHIR ServiceRequest mapper reads subject/requester/encounter, priority/status, note, code/coding tests, and currently sets result null, review not reviewed, showResultsToPatient false (`mappers.ts:376-405`).
- Mock evidence: `data/lab-orders.json` includes priority, status, notesToLab, tests with result null, review status/reviewer/time, showResultsToPatient.

## Billing/insurance/payment data

- Insurance is represented in types (`src/types/index.ts:22-29`, patient insurance at `52`) and validation/forms include provider, policy number, group number, expiry date, holder name, relationship.
- Patient registration/edit forms expose an optional Insurance section with those fields. However, the live patient mapper hard-codes `insurance: null` (`src/lib/api/mappers.ts:212`) and `registerPatient`/`updatePatientDemographics` payloads omit insurance fields (`src/lib/actions/patient-actions.ts`, payloads include demographics/contact/emergency only).
- No billing, invoice, claims, payment, transaction, or receipt routes/components/API clients were found in `apps/doctor/src` (searched file names and references). Therefore payment/billing data does not appear visible to doctor users in this frontend, except optional insurance form fields that appear not persisted/displayed from backend in current code.

## Documents/files

- No patient document/file upload, attachments, imaging document, scanned report, referral document, or file API client was found in `apps/doctor/src` by file-name/reference search.
- The UI references lab “Reports” in the tab label and lab result review affordances, but no actual document/file fields or result document display are implemented in the inspected frontend. Encounter `auditTrailIds` exists in the type/mock encounters but no audit document display was found.

## Staff/facility data linked to patients

- Patient-linked records carry `doctorId`/`practitionerId` on appointments, encounters, prescriptions, lab orders, tasks (`types/index.ts:79`, `115`, `168`, `199`, `212`). FHIR mappers extract practitioner/requester references for appointments, encounters, prescriptions, labs (`mappers.ts:279-283`, `310-319`, `339-356`, `377-392`).
- Appointment UI can show `room` when present in the normalized appointment (`dashboard/page.tsx:124-127`, `ScheduleClient.tsx:112-115`), but live FHIR appointment mapper currently sets `room: ''` (`mappers.ts:294`). Mock appointments include rooms.
- Tasks are linked to patients via `relatedPatientId`/FHIR `for` reference and can reveal patient names/clinical context in titles/descriptions (`types/index.ts:210-219`; `data/tasks.json`). Dashboard sidebar links task titles to patient charts and displays task descriptions/due dates/priority.
- Practitioner directory API exists (`src/lib/api/practitioners.ts`) with practitioner name/role/specialty/phone/email/qualification/license, but no patient screen was found displaying doctor details other than IDs in data models; settings screen displays a static doctor profile and clinic address not tied to a patient.

## API endpoints/fields that provide data

- Patient identity/demographics:
  - `GET /patients` and optional search param, `GET /patients/{id}`, `GET /patients/code/{code}`, `POST /patients`, `PATCH /patients/{id}` (`src/lib/api/patients.ts:5-23`, `39-46`).
  - Fields mapped from FHIR Patient: identifiers patient-code/NIC, name, gender, birthDate, telecom phone/email, address, contact emergency, extensions bloodType/nationality/occupation/maritalStatus (`mappers.ts:8-35`, `159-218`).
- Allergies/problems:
  - `GET /patients/{patientId}/allergies`, `POST /patients/{patientId}/allergies`, `GET /patients/{patientId}/conditions` (`patients.ts:29-36`, `49-50`).
  - Allergy fields: substance/code, reaction, criticality/severity, note, recordedDate (`mappers.ts:37-47`, `222-239`). Condition fields: ICD code/display, clinical status, onset, note (`mappers.ts:49-58`, `242-259`).
- Appointments/schedule:
  - `GET /appointments` with date/practitionerId/patientId filters, `GET /appointments/schedule/{practitionerId}`, `PUT /appointments/{id}`, `POST /appointments` (`appointments.ts:5-32`).
  - FHIR Appointment fields: status/start/end/serviceType/reasonCode/description/comment/participants/extensions (`mappers.ts:60-80`, normalized at `274-296`).
- Encounters:
  - `GET /encounters?patientId=...`, `GET /encounters/{id}`, `POST /encounters`, `PUT /encounters/{id}/status` (`encounters.ts:5-25`).
  - FHIR Encounter fields: subject, participant, appointment, period, reasonCode, extensions for chief complaint and SOAP (`mappers.ts:83-97`, `309-335`).
- Notes/vitals/prescriptions/labs:
  - Notes: `GET /notes?encounterId=...`, `POST /notes` (`clinical.ts:10-17`).
  - Vitals: `GET /vitals?patientId=...`, `GET /vitals/patient/{patientId}/trend`, `POST /vitals` (`clinical.ts:22-34`).
  - Prescriptions: `GET /prescriptions?patientId=...`, `GET /prescriptions/pending`, `POST /prescriptions` (`clinical.ts:39-51`), mapped from MedicationRequest (`mappers.ts:99-128`, `338-373`).
  - Labs: `GET /lab-orders?patientId=...`, `GET /lab-orders?status=results_pending`, `POST /lab-orders` (`clinical.ts:56-68`), mapped from ServiceRequest (`mappers.ts:130-142`, `376-405`).
- Tasks:
  - `GET /tasks`, `GET /tasks?status=open`, `POST /tasks`, `PUT /tasks/{id}` (`src/lib/api/tasks.ts`); task FHIR fields include `for` patient reference, description, notes, due date, priority/status, owner extension (`mappers.ts:144-154` and task mapper).
- Auth/context: Authorization token stored in localStorage and sent as bearer token (`src/lib/api/client.ts`); auth user can include practitionerId/patientId (`src/contexts/AuthContext.tsx`).

## Caveats/unknowns

- **Live backend may expose more/less than UI shows.** This inventory is frontend-based and does not inspect backend services or runtime API responses.
- **Static mock data may be stale.** `data/*.json` contains rich patient/clinical examples, but `src/lib/data/api.ts` says backend now serves persisted patient/clinical data; local JSON appears mostly legacy except catalogs.
- **Some UI fields are not submitted/persisted in current actions.** Insurance and allergy form fields exist in registration/edit UI/schema, but `registerPatient`/`updatePatientDemographics` payloads omit insurance, tags, and allergies; allergies have a separate API function not used by these actions in inspected code. FHIR patient mapper sets `insurance: null` and allergies/currentMedications/problemList/tags empty for live patient objects.
- **Encounter diagnoses/vitals may not round-trip through current mappers.** Encounter creation captures diagnoses in UI state but `handleFinishVisit` does not post diagnoses/conditions; FHIR encounter mapper returns `diagnoses: []` and `vitals: {}`. Vitals are posted separately to `/vitals`, but patient chart/encounter detail pages do not call `getVitalsByPatient`/`getNotesByEncounter` directly.
- **Lab result contents are not actually mapped/displayed.** Lab order `result` exists in type/mock data, but live ServiceRequest mapper sets test `result: null`; Labs tab displays test status/name and review state only.
- **Pending labs dashboard feature is wired but disabled.** `DashboardSidebar` can display pending labs, but `dashboard/page.tsx` passes `pendingLabs={[]}`.
- **Documents/files and billing/payments are absent in this frontend.** No routes/components/API clients for documents, file uploads, invoices, payments, claims, or receipts were found.
