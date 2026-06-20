# Receptionist frontend: patient-related data visible to receptionist users

## Role/frontend summary

- App inspected: `/Users/admin/Developer/curo/curo-receptionist`, a Next.js receptionist portal. The dashboard layout is protected by login only; `ProtectedRoute` verifies a stored user exists but does not enforce a role in the frontend (`src/components/layout/ProtectedRoute.tsx`, `src/contexts/AuthContext.tsx`). The sidebar labels it as the “Receptionist Portal” and exposes Dashboard, Patients, Appointments, Schedule, Reports, Settings.
- Main patient-data API clients are:
  - `GET /patients`, `GET /patients/{id}`, `GET /patients/code/{code}`, `GET /patients/{id}/allergies`, `GET /patients/{id}/conditions`, `POST /patients`, `PATCH /patients/{id}`, `POST /patients/{id}/allergies` in `src/lib/api/patients.ts:5-50`.
  - `GET /appointments`, `GET /appointments/schedule/{practitionerId}`, `PUT /appointments/{id}`, `POST /appointments` in `src/lib/api/appointments.ts:5-32`.
  - `GET /auth/practitioners?role=DOCTOR` in `src/lib/api/practitioners.ts:14-21`.
- The app maps FHIR-like backend resources into local `Patient`, `Allergy`, `Problem`, `Appointment`, `Encounter`, `Prescription`, `LabOrder`, `Visit`, and `Doctor` types (`src/types/index.ts:31-192`; mapper raw shapes at `src/lib/api/mappers.ts:8-155`). In current receptionist screens, patient, allergy, appointment, doctor/practitioner, and aggregate report data are visible; problems/conditions, encounter/SOAP, prescription, lab-order/result, document/file, and payment/billing data are typed or mocked but not surfaced by active routes/components.

## User-facing screens/features

### Dashboard (`/dashboard`, `DashboardPage`)
- Fetches today’s appointments, all patients, and doctors: `getAppointments({ date: todayStr })`, `getPatients()`, `getDoctors()` (`src/app/(dashboard)/dashboard/page.tsx:42-44`).
- Shows appointment counts: total, checked-in, with doctor, completed (`src/app/(dashboard)/dashboard/page.tsx:63-73`).
- `TodayAppointments` shows each appointment’s time, patient name link, appointment status, doctor name, visit type, reason, patient age/sex, room, and actions Check In / Send to Doctor / Complete / View (`src/components/features/dashboard/TodayAppointments.tsx:96-179`).
- `QueueSummary` shows waiting patient names, wait minutes, doctor, and visit type (`src/components/features/dashboard/QueueSummary.tsx:14-19`, `43-73`).
- Upcoming card shows upcoming patient names, time, doctor, and visit type (`src/app/(dashboard)/dashboard/page.tsx:127-141`).

### Patients directory (`/patients`, `PatientsDirectoryPage` + `PatientList`)
- Fetches all patients (`src/app/(dashboard)/patients/page.tsx:10`, `18`) and passes them to `PatientList` (`src/app/(dashboard)/patients/page.tsx:40`).
- Searchable by patient name, NIC, MRN, or phone (`src/components/features/patients/PatientList.tsx:33-39`, `49`).
- Table columns/data: Patient full name, MRN, NIC, age/sex, phone, registered date, View action (`src/components/features/patients/PatientList.tsx:61-68`, `81-106`).

### Patient detail (`/patients/[patientId]`, `PatientDetailPage`, `PatientHeader`, `PatientChartTabs`)
- Fetches patient by ID, allergies, patient appointments, and doctors (`src/app/(dashboard)/patients/[patientId]/page.tsx:32-35`).
- Passes `visits={[]}` currently, so Visit History tab normally displays “No visit history” despite having a `VisitHistoryTab` component (`src/app/(dashboard)/patients/[patientId]/page.tsx:61-67`).
- Header shows patient full name, MRN, NIC, sex, age, blood type, phone, insurance indicator (Insured / No Insurance), allergies banner with substance + reaction, expandable emergency contact name/relationship/phone, and actions Edit Demographics / Book Appointment (`src/components/features/patients/PatientHeader.tsx:45-82`, `105-114`, `121-167`).
- Demographics tab shows personal, contact, emergency-contact, insurance, and tag data (`src/components/features/patients/tabs/DemographicsTab.tsx:56-73`, `88-90`, `108-115`, `134-168`, `174-184`).
- Appointments tab shows date, time, doctor, visit type, reason, status for that patient (`src/components/features/patients/tabs/AppointmentsTab.tsx:59-86`).
- Visit History tab can display visit date, visit status, doctor, notes, check-in time, and check-out time if visits are provided (`src/components/features/patients/tabs/VisitHistoryTab.tsx:33-60`), but current page provides an empty array.

### Register New Patient (`/patients/new`, `PatientRegistrationForm`)
- Screen uses `PatientRegistrationForm` (`src/app/(dashboard)/patients/new/page.tsx`).
- Captures/validates personal identifying data: NIC/Passport, first name, last name, date of birth, sex, blood type, nationality, marital status, occupation (`src/components/features/patients/PatientRegistrationForm.tsx:92-205`; schema in `src/lib/validations/patient.ts:12-39`).
- Captures contact data: phone, email, address line 1/2, city, district, postal code, country (`src/components/features/patients/PatientRegistrationForm.tsx:209-293`).
- Captures emergency contact: name, relationship, phone (`src/components/features/patients/PatientRegistrationForm.tsx:297-350`).
- Captures optional insurance fields in UI: provider, policy number, group number, expiry date, holder name, relationship (`src/components/features/patients/PatientRegistrationForm.tsx:354-433`).
- Captures allergies in UI: substance, reaction, severity, notes (`src/components/features/patients/PatientRegistrationForm.tsx:437-511`).
- Captures tags as comma-separated text (`src/components/features/patients/PatientRegistrationForm.tsx:516-535`).
- Important caveat: the submit action payload sends only demographics/contact/emergency fields plus bloodType/nationality/maritalStatus/occupation/address; it does **not** submit insurance, allergies, or tags (`src/lib/actions/patient-actions.ts:11-33`).

### Edit Patient Demographics (`/patients/[patientId]/edit`, `PatientEditForm`)
- Fetches patient and allergies for editing (`src/app/(dashboard)/patients/[patientId]/edit/page.tsx` read; same API calls as detail page).
- Displays the same personal/contact/emergency/insurance/allergy/tag fields as registration, initialized from existing patient/allergies (`src/components/features/patients/PatientEditForm.tsx`).
- Important caveat: update payload sends only first/last name, NIC, birthDate, gender, phone, email, city, addressLine1, country, and emergency contact fields; it omits blood type, nationality, marital status, occupation, address line 2, district/state, postal code, insurance, allergies, and tags (`src/lib/actions/patient-actions.ts:54-69`).

### Appointments (`/appointments`, `AppointmentList`)
- Fetches all appointments, all patients, and doctors (`src/app/(dashboard)/appointments/page.tsx:31-35`).
- Filters by date, doctor, and status (`src/components/features/appointments/AppointmentList.tsx:90-110`, `142-178`).
- Table shows date, time, patient name/link, doctor, type, reason, and status (`src/components/features/appointments/AppointmentList.tsx:216-280`).
- Allows status changes among Scheduled, Not Arrived, Arrived, Waiting, In Progress, Completed, Cancelled, No Show, updating `PUT /appointments/{id}` (`src/components/features/appointments/AppointmentList.tsx:58-67`, `112-120`; API action `src/lib/actions/appointment-actions.ts:42-67`).

### Book Appointment (`/appointments/new`, `BookAppointmentForm`)
- Fetches patients, doctors, and appointments (`src/app/(dashboard)/appointments/new/page.tsx:28-32`).
- Patient selection/search exposes patient full name, MRN, and NIC (`src/components/features/appointments/BookAppointmentForm.tsx:181`, `204`, `222`).
- Doctor selection exposes doctor full name, specialty, and room (`src/components/features/appointments/BookAppointmentForm.tsx:241-283`).
- Date/time section exposes appointment date, doctor available days, booked time slots, selected time (`src/components/features/appointments/BookAppointmentForm.tsx:297-356`).
- Visit Details captures visit type, reason for visit, and additional notes (`src/components/features/appointments/BookAppointmentForm.tsx:363-405`).
- Submit payload sends patientId, practitionerId, start/end timestamps, reasonCode, serviceType, and comment to `POST /appointments` (`src/lib/actions/appointment-actions.ts:22-33`).

### Queue Board (`/queue`, `QueueBoard`)
- Fetches today’s appointments, all patients, and doctors (`src/app/(dashboard)/queue/page.tsx:32-39`).
- Waiting column shows patient name, doctor name, wait minutes, checked-in time, and room; includes “Send to Doctor” action (`src/components/features/queue/QueueBoard.tsx:49-53`, `140-202`).
- With Doctor column shows patient name, doctor name, optional started time from a visit, and Complete action (`src/components/features/queue/QueueBoard.tsx:55-57`, `210-271`).
- Completed column shows patient name, doctor name, and optional visit notes (`src/components/features/queue/QueueBoard.tsx:279-285` plus following component lines).
- Current page passes `visits={[]}`, so visit-derived started time/notes usually do not render (`src/app/(dashboard)/queue/page.tsx:54`).

### Schedule (`/schedule`, `ScheduleClient`)
- Fetches all appointments, patients, doctors (`src/app/(dashboard)/schedule/page.tsx:27-31`).
- Appointment cards show time, status, patient name, age/sex, visit type, room, reason, doctor last name, and actions Check In / Send to Queue / Patient (`src/app/(dashboard)/schedule/ScheduleClient.tsx:84-90`, `100-168`).
- Day list filters by date and doctor (`src/app/(dashboard)/schedule/ScheduleClient.tsx:193-203`).
- Calendar event titles are patient names and subtitles appointment times (`src/app/(dashboard)/schedule/ScheduleClient.tsx` inspected; event mapping around `calendarEvents`).

### Reports (`/reports`, `ReportsDashboard`)
- Fetches appointments, patients, doctors (`src/app/(dashboard)/reports/page.tsx:28-32`).
- Aggregates appointment counts and new patient registrations by today/week/month (`src/components/features/reports/ReportsDashboard.tsx:85-112`, `170-212`).
- Shows appointments by doctor: doctor, specialty, total, completed, no-shows (`src/components/features/reports/ReportsDashboard.tsx:115-134`, `255-299`).
- Shows appointments by visit type and peak hours (`src/components/features/reports/ReportsDashboard.tsx:137-168`, `304-340`).
- Does not show individual patient names, but uses patient `registeredAt` for “New Registrations”.

### Settings (`/settings`)
- Receptionist profile/settings only; no patient-specific data. Displays hardcoded receptionist employee/contact/clinic fields in `src/app/(dashboard)/settings/page.tsx`.

## Patient-identifying data

Visible categories:
- Internal patient ID is used in links/routes and API params but usually not rendered directly.
- MRN/patient code: directory row badge, patient header, appointment booking selected/search results, mock data, and `Patient.mrn` type (`PatientList.tsx:81-87`; `PatientHeader.tsx:45-54`; `BookAppointmentForm.tsx:181`, `222`; `src/types/index.ts:31-35`). Backend FHIR identifier system `urn:curo:patient-code` maps to MRN (`src/lib/api/mappers.ts:166-185`).
- NIC / Passport: patient directory, header, demographics, booking search/selection, registration/edit forms (`PatientList.tsx:92`; `PatientHeader.tsx:60`; `DemographicsTab.tsx:56`; `BookAppointmentForm.tsx:181`, `222`; `src/lib/validations/patient.ts:12`). Backend FHIR identifier system `urn:curo:nic` maps to NIC (`src/lib/api/mappers.ts:166-167`).
- Name: full/first/last in directory, header, booking, queue/schedule/dashboard; mapped from FHIR name (`src/lib/api/mappers.ts:159-190`; `src/types/index.ts:31-35`).
- Date of birth and derived age: DOB shown in demographics; age/sex shown in directory, header, dashboard/schedule (`DemographicsTab.tsx:57`; `PatientList.tsx:95-97`; `PatientHeader.tsx:63-67`; `TodayAppointments.tsx:133-138`; `ScheduleClient.tsx:121-124`).
- Sex/gender: visible in directory/header/demographics/schedule/dashboard; mapped from FHIR `gender` (`src/lib/api/mappers.ts:191-192`).
- Phone and email: phone in directory/header/demographics; email in demographics; registration/edit forms (`PatientList.tsx:100`; `PatientHeader.tsx:76`; `DemographicsTab.tsx:88-89`). Backend FHIR telecom maps phone/email (`src/lib/api/mappers.ts:169-170`, `197-198`).
- Address: line1/line2/city/district/postalCode/country shown in demographics and captured in forms (`DemographicsTab.tsx:28-33`, contact card; `src/types/index.ts:7-14`). Backend FHIR address maps line/city/state/postal/country (`src/lib/api/mappers.ts:18-24`, `199-205`).
- Emergency contact: name, relationship, phone visible in expandable patient header and demographics; captured in forms (`PatientHeader.tsx:138-167`; `DemographicsTab.tsx:108-115`; `src/types/index.ts:16-20`). Backend FHIR contact maps these fields (`src/lib/api/mappers.ts:25-29`, `207-211`).
- Nationality, marital status, occupation: visible in demographics and captured in forms; mapped from FHIR extensions (`DemographicsTab.tsx:65-73`; `src/lib/api/mappers.ts:174-177`, `193-196`).
- Tags: UI and type support tags; demographics displays them when present (`DemographicsTab.tsx:174-184`; `src/types/index.ts:50`). Current FHIR mapper always returns empty tags (`src/lib/api/mappers.ts:216`).
- Registration metadata: directory/report use `registeredAt`; Patient type includes `registeredBy`, `createdAt`, `updatedAt` (`PatientList.tsx:103`; `ReportsDashboard.tsx:108-110`; `src/types/index.ts:51-54`). FHIR mapper sets dates from `meta.lastUpdated` and registeredBy blank (`src/lib/api/mappers.ts:217-220`).

## Clinical data

Visible or potentially visible in current receptionist frontend:
- Blood type: shown in patient header if present and in Demographics tab; captured in registration/edit UI (`PatientHeader.tsx:67-70`; `DemographicsTab.tsx:64`). Mapped from FHIR extension `urn:curo:bloodType` (`src/lib/api/mappers.ts:174`, `193`).
- Allergies: detail/edit pages fetch `GET /patients/{patientId}/allergies`; header renders “Allergies on Record” with substance and reaction (`src/app/(dashboard)/patients/[patientId]/page.tsx:32-35`; `PatientHeader.tsx:121-132`). Allergy type includes substance, reaction, severity, notes, recordedAt (`src/types/index.ts:57-65`). Registration/edit forms display allergy fields including severity and notes, but action payloads do not submit them (`PatientRegistrationForm.tsx:437-511`; `PatientEditForm.tsx`; `patient-actions.ts:11-33`, `54-69`).
- Problems/conditions: `Problem` type and `getConditions(patientId)` client exist (`src/types/index.ts:67-75`; `src/lib/api/patients.ts:34-36`), and `mapFhirCondition` maps ICD code/name/status/onset/notes (`src/lib/api/mappers.ts:244-259`). No active receptionist route/component was found calling `getConditions` or rendering problem lists. Mock `data/problems.json` contains Type 2 diabetes, hypertension, asthma with ICD codes and notes.
- Visit notes: `VisitHistoryTab` can render `visit.notes` and queue completed cards can render `visit.notes`, but current pages pass empty visits arrays (`VisitHistoryTab.tsx:50-51`; `QueueBoard.tsx` completed column; `patients/[patientId]/page.tsx:66`; `queue/page.tsx:54`). Mock `data/visits.json` contains notes such as “Lab review follow-up” and “Wheezing, cough - waiting to see doctor”.
- Encounter/SOAP: types/mappers exist for encounter chief complaint and SOAP subjective/objective/assessment/plan (`src/types/index.ts:93-110`; `src/lib/api/mappers.ts:83-97`, `314-335`), but no active receptionist API client or component displays encounters/SOAP.

## Appointment/encounter data

Visible appointment data:
- Appointment date, time, doctorId/doctor name, patientId/patient name, reason, visitType, status, room, notes, checkInTime, checkedInBy, visitId are in the `Appointment` type (`src/types/index.ts:77-91`).
- API maps FHIR Appointment status/start/serviceType/reasonCode/description/comment/participants into local appointment fields (`src/lib/api/mappers.ts:60-80`, `270-301`).
- Appointment reason/visit type/status are displayed broadly: dashboard (`TodayAppointments.tsx:125-131`), appointments table (`AppointmentList.tsx:216-252`), patient appointments tab (`AppointmentsTab.tsx:61-86`), schedule cards (`ScheduleClient.tsx:100-135`), reports aggregate by visit type/status (`ReportsDashboard.tsx:89-168`).
- Check-in/queue status and timestamps: `TodayAppointments` can set local `checkInTime`, `checkedInBy: "rec_8001"`, and status on check-in (`TodayAppointments.tsx:26-34`); queue and summary compute wait time from `checkInTime` (`QueueSummary.tsx:43-68`; `QueueBoard.tsx:140-181`).
- Encounter/SOAP data is typed/mapped but not exposed by current routes (see Clinical data caveat above).

## Medication/prescription data

- Patient type includes `currentMedications: string[]` (`src/types/index.ts:49`) and mock `data/patients.json` has medication IDs such as `currentMedications: ["medrec_5001"]`, but current FHIR patient mapper always returns `currentMedications: []` (`src/lib/api/mappers.ts:215`).
- Prescription and prescription-item types exist with medicationId, displayName, dose, route, frequency, durationDays, quantity, instructions, substitutes, notesToPharmacy (`src/types/index.ts:112-135`).
- FHIR MedicationRequest mapper can map medication display/code, dosage, route, quantity, duration, instructions, and pharmacy notes (`src/lib/api/mappers.ts:99-128`, `338-374`).
- No active receptionist route/component/API client was found displaying prescriptions, medication requests, current medications, or medication details.

## Lab data

- Lab-order types exist with patientId, encounterId, doctorId, priority, status, notesToLab, tests, result, showResultsToPatient (`src/types/index.ts:137-155`).
- FHIR ServiceRequest mapper can map lab order status/priority/subject/requester/encounter/code/notes into `LabOrder` (`src/lib/api/mappers.ts:130-142`, `376-402`).
- There is a utility comment for looking up lab test display names (`src/lib/utils.ts:76`), but no active lab route/component/API client in the receptionist app.
- Appointment/visit reasons may mention lab review (e.g., mock appointment “Review lab results”), but actual lab orders/results are not rendered by current receptionist screens.

## Billing/insurance/payment data

- Insurance data model: provider, policyNumber, groupNumber, expiryDate, holderName, relationship (`src/types/index.ts:22-29`).
- Patient header shows only an insurance indicator: “Insured” or “No Insurance” (`PatientHeader.tsx:82-99`).
- Demographics tab can show full insurance details if `patient.insurance` is present (`DemographicsTab.tsx:134-168`).
- Registration/edit forms capture optional insurance fields (`PatientRegistrationForm.tsx:354-433`; `PatientEditForm.tsx` analogous), but current patient create/update actions omit those fields from payloads (`src/lib/actions/patient-actions.ts:11-33`, `54-69`), and the FHIR mapper currently sets `insurance: null` (`src/lib/api/mappers.ts:212`).
- No payment, invoice, billing charge, balance, claim, or receipt data/screens/API clients were found in the receptionist frontend.

## Documents/files

- No patient document/file upload/download/viewer screens or API clients were found.
- Only generic UI/input styling includes file-input CSS (`src/components/ui/input.tsx` via grep), not a patient document feature.

## Staff/facility data linked to patients

- Doctors/practitioners: fetched from `/auth/practitioners?role=DOCTOR`; fields include id, name, role, specialty, phone, email, qualification, licenseNumber (`src/lib/api/practitioners.ts:3-17`). Pages map practitioners to local `Doctor` objects with name/specialty/phone/email and default empty room/availability unless using mock/local doctor shape (`dashboard/page.tsx:18-28` and similar).
- Staff/facility data visible with patient appointments: doctor name and specialty; room number appears in appointment type and mock data, schedule cards, queue board, and booking doctor cards (`BookAppointmentForm.tsx:241-283`; `ScheduleClient.tsx:121-135`; `QueueBoard.tsx:101-103`, `183-187`).
- Receptionist/staff linkage: appointment type has `checkedInBy`; mock appointments/visits contain `checkedInBy`/`createdBy` values like `rec_8001`. UI does not generally display the receptionist ID except local state sets `checkedInBy: "rec_8001"` on check-in (`TodayAppointments.tsx:31-34`).
- Reports aggregate by doctor and specialty (`ReportsDashboard.tsx:115-134`, `255-299`).

## API endpoints/fields that provide data

- Auth/session:
  - `POST /auth/login` returns `accessToken`, `refreshToken`, and `user` with id/email/role/patientId/practitionerId/name (`src/contexts/AuthContext.tsx`). No frontend role guard was found.
  - `POST /auth/refresh` refreshes tokens (`src/lib/api/client.ts`).
- Notifications:
  - `GET /notifications/count` returns `{ count }`; displayed only as a topbar unread count, not patient-specific in frontend (`src/lib/api/notifications.ts`).
- Patients:
  - `GET /patients` returns FHIR Patient[]; mapped fields: id, patient code/MRN, NIC, name, birthDate/DOB, gender/sex, phone, email, address, emergency contact, bloodType, nationality, occupation, maritalStatus, meta.lastUpdated as registration/update timestamps (`src/lib/api/patients.ts:5-8`; `src/lib/api/mappers.ts:159-220`).
  - `GET /patients/{id}` same mapping for detail/edit (`src/lib/api/patients.ts:11-17`).
  - `GET /patients/code/{code}` exists but no active UI call found (`src/lib/api/patients.ts:20-26`).
  - `GET /patients/{id}/allergies` maps AllergyIntolerance: id, patientId, substance, reaction, severity, notes, recordedAt (`src/lib/api/patients.ts:29-31`; `src/lib/api/mappers.ts:224-241`).
  - `GET /patients/{id}/conditions` maps Condition: patientId, icdCode, name, status, onsetDate, notes, but no active UI call found (`src/lib/api/patients.ts:34-36`; `src/lib/api/mappers.ts:244-259`).
  - `POST /patients` in actions sends firstName, lastName, nic, birthDate, gender, phone, email, bloodType, nationality, maritalStatus, occupation, addressLine1/2, city, state/district, postalCode, country, emergency contact fields (`src/lib/actions/patient-actions.ts:11-36`).
  - `PATCH /patients/{id}` in update action sends a narrower demographic/contact/emergency payload (`src/lib/actions/patient-actions.ts:54-72`).
  - `POST /patients/{id}/allergies` exists in API client but no current form action calls it (`src/lib/api/patients.ts:49-50`).
- Appointments:
  - `GET /appointments` accepts optional `date`, `practitionerId`, `patientId`; maps appointment id/date/time/doctorId/patientId/reason/visitType/status/notes (`src/lib/api/appointments.ts:5-11`; `src/lib/api/mappers.ts:270-301`).
  - `GET /appointments/schedule/{practitionerId}` exists (`src/lib/api/appointments.ts:18-22`).
  - `POST /appointments` from booking sends patientId, practitionerId, start/end, reasonCode, serviceType, comment (`src/lib/actions/appointment-actions.ts:22-33`).
  - `PUT /appointments/{id}` updates status from frontend statuses to FHIR status values (`src/lib/actions/appointment-actions.ts:42-67`; generic API client at `src/lib/api/appointments.ts:25-27`).
- Practitioners/doctors:
  - `GET /auth/practitioners?role=DOCTOR`; fields id, name, role, specialty, phone, email, qualification, licenseNumber (`src/lib/api/practitioners.ts:3-17`).

## Caveats/unknowns

- The codebase contains older mock JSON in `/data` with richer patient, appointment, allergy, problem, visit, and doctor fields (e.g., insurance details, problem list/current medications IDs, visit notes), but `src/lib/data/api.ts` says data is now fetched from backend and stubs many file-system operations. Current active pages use `src/lib/api/*`, not the JSON files.
- Because frontend role enforcement is not present, “receptionist users” here means users authenticated into this receptionist app, not a verified frontend role. Backend authorization may still restrict data, but that is outside this frontend inspection.
- Insurance UI is present, and mock data has insurance, but current mapper returns `insurance: null`; backend may return insurance through a different resource not wired here.
- Allergy fields in registration/edit UI are visible/captured client-side, but not submitted by current patient actions; only detail/edit pages fetch existing allergies from the API.
- Conditions/problems, encounters/SOAP, prescriptions/medications, lab orders/results, tasks, and visits have types/mappers/mock examples, but active receptionist routes do not fetch/render most of them. Visit UI exists but receives empty arrays in current patient detail and queue pages.
- No patient document/file and no payment/billing screens or API clients were found.
