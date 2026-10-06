# Patient Data Access by Frontend

Generated from a frontend code review of:

- `apps/pharmacy/`
- `apps/doctor/`
- `apps/patient/`
- `apps/lab/`
- `apps/receptionist/`

This report describes **what patient-related data each frontend can display or collect in its current UI**, plus **patient-related API/type data that is wired into that frontend but may not currently be rendered**.

## Important scope notes

- This is a **frontend-only** review. Backend authorization, backend response filtering, database policy, and runtime environment behavior were not inspected.
- “Access” here means one of:
  - **Rendered/collected in current UI**: visible to a user in a page/component, or entered through a frontend form.
  - **Fetched by current UI**: API call is made from a current page/component; even if not every field is rendered, the client receives the mapped object.
  - **Available in frontend API/types but not visibly used**: the frontend has API helpers/types/mappers for the data, but current pages do not render it.
- Several apps contain shared or legacy types/mappers for richer patient data than the current screens display. I call these out separately so they are not confused with actively visible data.
- The apps rely mostly on FHIR-like API resources mapped in `src/lib/api/mappers.ts` files.
- Role enforcement appears to be mainly app-level/protected-route authentication in the frontend. Fine-grained role filtering, if present, would be backend-side and outside this review.

## High-level access matrix

| Frontend | Primary user | Patient identity/demographics | Contact/address | Emergency contact | Insurance/payment | Allergies/problems | Encounters/visits/SOAP | Vitals/diagnoses | Prescriptions/meds | Lab orders/results | Appointments/queue | Patient documents/files |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `curo-doctor` | Doctor/clinician | High | High | High | Medium/typed; UI forms include insurance, live mapper often null | High | High | High in new visit capture; partial display | High | High orders; result detail limited | High | None found |
| `curo-receptionist` | Reception/front desk | High | High | High | High in UI forms/types; live mapper currently null | Medium: allergy alerts visible; problem types not surfaced | Low: visit UI exists but current page passes empty visits | Low/none | Low/typed only; not surfaced | Low/typed only; not surfaced | High | None found |
| `curo-patient` | Patient | High, self-profile | High, self-profile | High, self-profile | High, self-profile when present | High, self health records | Medium: visit list shows summary; full visit notes withheld | Low/partial; no full vitals screen found | High, own prescriptions | Medium/high for own lab orders and mapped results | High, own appointments | None found |
| `curo-lab` | Lab staff | Medium/high: patient name, MRN, age/sex, blood type; patient detail has contact | Medium in patient detail | Available in patient object but not prominent in lab UI | Low/none in current UI | Low: patient API can fetch allergies/conditions but not surfaced | Low: encounter IDs/references only | Low/none except test result values entered | Low/typed only; not surfaced | Very high | Low/none | None found |
| `curo-pharmacy` | Pharmacy staff | Medium/high: patient name, MRN, NIC, age/sex, blood type | Medium: phone/email in detail | Available in patient type/API but not prominent in pharmacy UI | Medium: dispense totals, item subtotals, stock costs; insurance only in type | Medium: allergies/current meds shown on patient pages; conditions API exists but not surfaced | Low: encounter IDs on prescriptions only | Low/none | Very high | Low/none | Low/none | None found |

---

# 1. `apps/doctor/` — Doctor frontend

## Summary

The doctor portal has the broadest patient data exposure. It is a clinical charting frontend. Doctors can see patient demographics, clinical alerts, conditions, allergies, encounter history, prescription history, lab orders, and appointment/schedule context. Doctors can also create new encounters with chief complaint, SOAP notes, vitals, diagnoses, prescriptions, and lab orders.

Primary evidence:

- Patient chart page fetches patient, allergies, conditions, encounters, lab orders, prescriptions, and lab catalog: `apps/doctor/src/app/(dashboard)/patients/[patientId]/page.tsx`.
- Patient header and tabs render these objects: `apps/doctor/src/components/features/patients/PatientHeader.tsx`, `PatientChartTabs.tsx`, and `tabs/*`.
- New visit editor collects SOAP, vitals, diagnoses, prescriptions, and lab orders: `apps/doctor/src/components/features/encounters/EncounterEditor.tsx` and `sections/*`.
- Core data model: `apps/doctor/src/types/index.ts`.
- API helpers: `apps/doctor/src/lib/api/patients.ts`, `appointments.ts`, `encounters.ts`, `clinical.ts`, `tasks.ts`.

## Data visible to doctor users

### Patient-identifying and demographic data

Visible in patient lists, headers, registration/edit forms, schedule, and chart:

- Patient internal ID and MRN/patient code.
- Full name, first name, last name.
- Date of birth and calculated age.
- Sex/gender.
- Blood type.
- Phone number.
- Email address in patient type/form/API mapping; not every list shows email.
- Address object:
  - line 1
  - line 2
  - city
  - district/state
  - postal code
  - country
- City is shown in the patient header.
- NIC/passport where present.
- Nationality.
- Marital status.
- Occupation.
- Patient tags.
- Created/updated timestamps in the type/model.

Evidence:

- `apps/doctor/src/types/index.ts` — `Patient`, `Address`, `EmergencyContact`, `Insurance` interfaces.
- `apps/doctor/src/components/features/patients/PatientHeader.tsx` — displays name, MRN, sex, age/DOB, blood type, phone, city, tags.
- `apps/doctor/src/components/features/patients/PatientList.tsx` — displays/searches name, MRN, phone, tags; shows age/sex and allergies.
- `apps/doctor/src/lib/api/mappers.ts` — maps FHIR Patient identifiers, name, gender, birthDate, telecom, address, emergency contact, and extensions.

### Emergency contact data

The patient header includes an expandable emergency contact section:

- Emergency contact name.
- Relationship.
- Phone number.

Evidence: `apps/doctor/src/components/features/patients/PatientHeader.tsx`.

### Insurance/billing-related data

The doctor app type model and patient registration validation include insurance fields:

- Provider.
- Policy number.
- Group number.
- Expiry date.
- Holder name.
- Relationship to holder.

However, current FHIR patient mapping often sets `insurance: null`, and the reviewed report noted that registration/update actions do not currently persist all insurance fields. No invoices, claims, payment screens, receipts, or billing ledger views were found in this frontend.

Evidence:

- `apps/doctor/src/types/index.ts` — `Insurance` and `Patient.insurance`.
- `apps/doctor/src/lib/validations/patient.ts` — insurance-related form fields.
- `apps/doctor/src/lib/actions/patient-actions.ts` — current create/update payload caveat.

### Allergies

Doctors can see detailed allergy data:

- Substance/allergen.
- Reaction.
- Severity: mild/moderate/severe.
- Notes.
- Recorded date.

Visible in:

- Patient header alert.
- Patient directory allergy tooltip/indicator.
- Allergies tab.
- Registration/edit form allergy UI.

Evidence:

- `apps/doctor/src/components/features/patients/PatientHeader.tsx`.
- `apps/doctor/src/components/features/patients/tabs/AllergiesTab.tsx`.
- `apps/doctor/src/lib/api/patients.ts` — `GET /patients/{patientId}/allergies`.
- `apps/doctor/src/lib/api/mappers.ts` — FHIR AllergyIntolerance mapping.

### Problems/conditions

Doctors can see patient problem/condition data:

- Problem/condition name.
- ICD-10 code.
- Status: active/resolved/inactive.
- Onset date.
- Notes.

Visible in:

- Overview tab active problems.
- Problems tab.

Evidence:

- `apps/doctor/src/components/features/patients/tabs/OverviewTab.tsx`.
- `apps/doctor/src/components/features/patients/tabs/ProblemsTab.tsx`.
- `apps/doctor/src/lib/api/patients.ts` — `GET /patients/{patientId}/conditions`.

### Encounters, visits, SOAP, diagnoses, vitals

Doctors can see and/or create encounter-related clinical data:

- Encounter ID.
- Patient ID.
- Doctor ID.
- Appointment ID.
- Encounter status.
- Started/ended timestamps.
- Chief complaint.
- SOAP notes:
  - subjective
  - objective
  - assessment
  - plan
- Vitals model:
  - pulse
  - respiration
  - systolic/diastolic blood pressure
  - temperature
  - SpO2
  - height
  - weight
- Diagnoses:
  - ICD code
  - diagnosis name
  - primary flag
- Prescription IDs and lab order IDs linked to encounter.
- Audit trail IDs in type model.

Current UI specifics:

- Encounter list shows date/status/chief complaint and diagnosis badges.
- New visit editor collects chief complaint, SOAP note fields, diagnoses, vitals, prescriptions, and lab orders.
- Some mapper caveats exist: FHIR encounter mapping may not round-trip diagnoses/vitals directly; vitals are posted separately.

Evidence:

- `apps/doctor/src/types/index.ts` — `Encounter`, `SOAP`, `Vitals`, `Diagnosis`.
- `apps/doctor/src/components/features/patients/tabs/EncountersTab.tsx`.
- `apps/doctor/src/components/features/encounters/EncounterEditor.tsx`.
- `apps/doctor/src/components/features/encounters/sections/ClinicalNotes.tsx`.
- `apps/doctor/src/components/features/encounters/sections/VitalsPanel.tsx`.
- `apps/doctor/src/components/features/encounters/sections/DiagnosisSearch.tsx`.
- `apps/doctor/src/lib/api/encounters.ts`.
- `apps/doctor/src/lib/api/clinical.ts`.

### Prescriptions and medications

Doctors can see prescription history and create prescriptions:

- Prescription ID.
- Patient ID.
- Encounter ID.
- Doctor ID.
- Status.
- Created/sent timestamps.
- Medication item details:
  - medication ID/code
  - display name
  - dose
  - route
  - frequency
  - duration in days
  - quantity
  - instructions
  - substitutes
- Notes to pharmacy.
- Static medication catalog fields such as generic name, form, strength, ATC, substitutes.

Visible in:

- Medications tab.
- New encounter prescription form.

Evidence:

- `apps/doctor/src/types/index.ts` — `Prescription`, `PrescriptionItem`, `Medication`.
- `apps/doctor/src/components/features/patients/tabs/MedicationsTab.tsx`.
- `apps/doctor/src/components/features/encounters/sections/PrescriptionForm.tsx`.
- `apps/doctor/src/lib/api/clinical.ts` — prescription endpoints.

### Lab orders and reports

Doctors can see lab order information and create lab orders:

- Lab order ID.
- Patient ID.
- Encounter ID.
- Doctor ID.
- Priority: routine/urgent/stat.
- Status.
- Created timestamp.
- Sent-to-lab timestamp.
- Notes to lab.
- Tests ordered.
- Per-test status.
- Review state:
  - reviewed/not reviewed
  - reviewed at
  - reviewed by
- Whether results are shown to patient.

Visible in:

- Labs & Reports tab.
- New encounter lab order form.

Caveat: current doctor lab tab appears to display order/test status and review state; detailed numeric result values may not be fully mapped/displayed there.

Evidence:

- `apps/doctor/src/types/index.ts` — `LabOrder`, `LabOrderTest`, `LabOrderReview`.
- `apps/doctor/src/components/features/patients/tabs/LabsTab.tsx`.
- `apps/doctor/src/components/features/encounters/sections/LabOrderForm.tsx`.
- `apps/doctor/src/lib/api/clinical.ts`.

### Appointments and schedule

Doctors can see appointment/schedule data:

- Appointment ID.
- Date/time.
- Doctor ID.
- Patient ID.
- Reason for visit.
- Visit type.
- Status.
- Room.
- Notes.
- Patient name and age/sex in schedule/dashboard context.

Evidence:

- `apps/doctor/src/app/(dashboard)/dashboard/page.tsx`.
- `apps/doctor/src/app/(dashboard)/schedule/ScheduleClient.tsx`.
- `apps/doctor/src/lib/api/appointments.ts`.

### Tasks linked to patients

Doctor task model includes patient-linked task information:

- Task title/description.
- Due date.
- Priority.
- Status.
- Related patient ID.

Evidence: `apps/doctor/src/types/index.ts`, `apps/doctor/src/lib/api/tasks.ts`.

### Documents/files

No patient document/file upload/download UI or API was found in the doctor frontend.

## Doctor caveats

- Frontend types can represent more data than current pages actually display.
- Static mock JSON may contain richer clinical examples, but current app comments indicate backend APIs are now the source for patient/clinical data; local JSON is mostly catalog/mock material.
- Insurance UI/types exist but may not be persisted or returned by current FHIR patient mapper.
- Detailed lab result values are not clearly surfaced in the doctor chart; lab orders/status/review are surfaced.
- No billing/payment/documents screens were found.

---

# 2. `apps/receptionist/` — Receptionist frontend

## Summary

The receptionist portal exposes broad administrative patient data: identity, demographics, contacts, emergency contact, insurance UI fields, allergies alert, appointments, scheduling, queue/check-in style data, and aggregate reports. It does **not** currently surface most clinical chart content such as SOAP notes, detailed conditions, prescriptions, lab results, or documents, even though some shared types/mappers exist.

Primary evidence:

- Patient detail fetches patient, allergies, appointments, doctors: `apps/receptionist/src/app/(dashboard)/patients/[patientId]/page.tsx`.
- Patient header and demographics tabs: `apps/receptionist/src/components/features/patients/PatientHeader.tsx`, `tabs/DemographicsTab.tsx`.
- Registration/edit forms and validation: `PatientRegistrationForm.tsx`, `PatientEditForm.tsx`, `src/lib/validations/patient.ts`.
- Appointment booking: `apps/receptionist/src/components/features/appointments/BookAppointmentForm.tsx`.
- Data model/API: `apps/receptionist/src/types/index.ts`, `src/lib/api/patients.ts`, `appointments.ts`, `practitioners.ts`.

## Data visible to receptionist users

### Patient-identifying and demographic data

Visible in patient directory, patient detail, registration, edit demographics, appointment booking/search:

- Patient ID.
- MRN/patient code.
- NIC/passport number.
- Full name, first name, last name.
- Date of birth and calculated age.
- Sex/gender.
- Blood type.
- Nationality.
- Marital status.
- Occupation.
- Tags.
- Registered by.
- Registered at.
- Created/updated timestamps.

Evidence:

- `apps/receptionist/src/types/index.ts` — `Patient` includes all above fields.
- `apps/receptionist/src/components/features/patients/PatientList.tsx` — patient directory shows name, MRN, NIC, age/sex, phone, registered date.
- `apps/receptionist/src/components/features/patients/PatientHeader.tsx` — header shows full name, MRN, NIC, sex, age, blood type, phone.
- `apps/receptionist/src/components/features/patients/tabs/DemographicsTab.tsx` — shows NIC/passport, DOB, sex, blood type, nationality, marital status, occupation.

### Contact and address data

Visible in demographics/registration/edit:

- Phone.
- Email.
- Address line 1.
- Address line 2.
- City.
- District/state.
- Postal code.
- Country.

Evidence:

- `apps/receptionist/src/components/features/patients/tabs/DemographicsTab.tsx`.
- `apps/receptionist/src/lib/validations/patient.ts`.
- `apps/receptionist/src/lib/api/mappers.ts`.

### Emergency contact data

Visible in patient header expandable section and demographics tab:

- Emergency contact name.
- Relationship.
- Phone number.

Evidence:

- `apps/receptionist/src/components/features/patients/PatientHeader.tsx`.
- `apps/receptionist/src/components/features/patients/tabs/DemographicsTab.tsx`.

### Insurance/billing-related data

Receptionist screens/forms include insurance details:

- Insurance provider.
- Policy number.
- Group number.
- Expiry date.
- Holder name.
- Relationship to holder.
- Insured/no-insurance indicator.

Important caveat: current FHIR patient mapper returns `insurance: null`, so live API-backed patient detail may often display “No insurance” unless another backend path populates it. The UI/forms and type model still expose/collect these fields.

No payment collection, invoices, balances, receipts, or claims screens were found.

Evidence:

- `apps/receptionist/src/types/index.ts` — `Insurance` and `Patient.insurance`.
- `apps/receptionist/src/components/features/patients/tabs/DemographicsTab.tsx` — insurance section.
- `apps/receptionist/src/components/features/patients/PatientHeader.tsx` — insured/no-insurance badge.
- `apps/receptionist/src/lib/validations/patient.ts` — insurance fields in registration schema.

### Allergies and limited clinical data

Receptionists can see allergy alerts/details:

- Allergen/substance.
- Reaction.
- Severity in type/API mapping.
- Notes in type/API mapping.
- Recorded date in type/API mapping.

Visible in:

- Patient header allergy banner with substance + reaction.
- Registration/edit allergy UI fields.

The app has `Problem`, `Encounter`, `Prescription`, and `LabOrder` types/mappers, but current receptionist pages do not render detailed conditions/problems, SOAP notes, prescription history, or lab results.

Evidence:

- `apps/receptionist/src/app/(dashboard)/patients/[patientId]/page.tsx` — fetches `getAllergies(patientId)`.
- `apps/receptionist/src/components/features/patients/PatientHeader.tsx` — allergy banner.
- `apps/receptionist/src/lib/api/patients.ts` — allergies and conditions helper endpoints exist.

### Appointments and scheduling data

Receptionists can see and create appointments:

- Appointment ID.
- Patient ID.
- Doctor ID.
- Date.
- Time.
- Visit type.
- Reason for visit.
- Status.
- Room.
- Notes.
- Check-in time.
- Checked-in-by user.
- Visit ID.
- Doctor name/specialty/room/availability in booking flow.

Visible in:

- Patient Appointments tab.
- Appointments list.
- Book Appointment form.
- Schedule page.
- Queue board.
- Dashboard widgets.

Evidence:

- `apps/receptionist/src/types/index.ts` — `Appointment`, `Doctor`, `Visit`.
- `apps/receptionist/src/components/features/patients/tabs/AppointmentsTab.tsx`.
- `apps/receptionist/src/components/features/appointments/BookAppointmentForm.tsx`.
- `apps/receptionist/src/lib/api/appointments.ts`.
- `apps/receptionist/src/lib/actions/appointment-actions.ts`.
- `apps/receptionist/src/lib/actions/checkin-actions.ts`.

### Visit/queue data

The receptionist type model and `VisitHistoryTab` can display:

- Visit ID.
- Appointment ID.
- Patient ID.
- Doctor ID.
- Date.
- Check-in time.
- Check-out time.
- Visit status.
- Notes.
- Created by.

Current patient detail passes `visits={[]}`, so the visit history tab normally shows no visit history. Queue/check-in pages may show operational visit/queue data depending on API responses.

Evidence:

- `apps/receptionist/src/types/index.ts` — `Visit`.
- `apps/receptionist/src/components/features/patients/tabs/VisitHistoryTab.tsx`.
- `apps/receptionist/src/app/(dashboard)/patients/[patientId]/page.tsx` — passes empty visits.

### Prescriptions/medications and lab data

Not currently visible in active receptionist patient screens. The app has shared `Prescription`, `LabOrder`, and related mappers/types, but active receptionist routes do not fetch/render prescription history, medication details, lab order details, or lab results.

### Documents/files

No patient documents, scans, attachments, upload/download components, or file APIs were found.

## Receptionist caveats

- Current UI can collect insurance/allergy fields, but some current create/update actions appear to omit some of these fields from payloads.
- `insurance` may be null from current mapper despite insurance UI.
- Visit history UI exists, but current patient detail passes an empty list.
- Shared types/mappers include clinical resources not currently surfaced.
- Backend authorization may still restrict data; frontend role enforcement is not fine-grained in this review.

---

# 3. `apps/patient/` — Patient portal

## Summary

The patient portal exposes patient data about the logged-in patient only. I found no dependent/guardian/family-member functionality in the current frontend. Patients can see their own profile, appointments, visit summaries, prescriptions, lab reports/orders, allergies, conditions, current medications, and insurance/profile details. Full visit notes are intentionally not shown in the visit detail page, which tells the patient to contact the clinic for a full copy.

Primary evidence:

- Patient portal API: `apps/patient/src/lib/api/patient-portal.ts`.
- Profile page: `apps/patient/src/app/(dashboard)/profile/page.tsx`.
- Health records: `apps/patient/src/app/(dashboard)/health-records/page.tsx`.
- Appointments: `apps/patient/src/app/(dashboard)/appointments/page.tsx`.
- Visits: `apps/patient/src/app/(dashboard)/visits/page.tsx`, `visits/[visitId]/page.tsx`.
- Prescriptions: `apps/patient/src/app/(dashboard)/prescriptions/page.tsx`, `prescriptions/[prescriptionId]/page.tsx`.
- Lab reports: `apps/patient/src/app/(dashboard)/lab-reports/page.tsx`.

## Data visible to patient users

### Authentication/user identity data held client-side

The auth context stores:

- User ID.
- Email.
- Role.
- Optional patient ID.
- Optional practitioner ID.
- Optional display name.
- Access token and refresh token in local storage.

Evidence:

- `apps/patient/src/contexts/AuthContext.tsx`.
- `apps/patient/src/lib/api/client.ts`.

### Profile/patient-identifying data

The profile page displays:

- Patient full name.
- Initials/avatar.
- MRN.
- Age.
- Date of birth.
- Sex.
- Blood type.
- NIC when present.
- Nationality when present.
- Marital status when present.
- Occupation when present.
- Patient since/created date.
- Last updated date.

Evidence: `apps/patient/src/app/(dashboard)/profile/page.tsx`.

### Contact and address data

Profile page displays:

- Phone.
- Email.
- Address line 1.
- Address line 2.
- City.
- District.
- Postal code.
- Country.

Evidence: `apps/patient/src/app/(dashboard)/profile/page.tsx`.

### Emergency contact data

Profile page displays:

- Emergency contact name.
- Relationship.
- Phone.

Evidence: `apps/patient/src/app/(dashboard)/profile/page.tsx`.

### Insurance data

If present, profile page displays:

- Insurance provider.
- Policy number.
- Group number.
- Holder name.
- Holder relationship.
- Expiry date.

Evidence: `apps/patient/src/app/(dashboard)/profile/page.tsx`.

### Allergies

Health Records page displays:

- Allergy substance.
- Severity.
- Reaction.
- Notes.
- Recorded date.

Evidence:

- `apps/patient/src/app/(dashboard)/health-records/page.tsx`.
- `apps/patient/src/lib/api/patient-portal.ts` — `GET /patients/{patientId}/allergies`.

### Conditions/problems

Health Records page displays:

- Active condition name.
- ICD code.
- Onset date.
- Notes.
- Active badge.
- Resolved/inactive condition name.
- Resolved/inactive ICD code.
- Resolved/inactive onset date.
- Status.

Evidence:

- `apps/patient/src/app/(dashboard)/health-records/page.tsx`.
- `apps/patient/src/lib/api/patient-portal.ts` — `GET /patients/{patientId}/conditions`.

### Current medications and prescriptions

Health Records page displays current medications derived from the latest prescription:

- Medication display name.
- Dose.
- Route.
- Frequency.
- Instructions.

Prescription list/detail pages display:

- Prescription ID through route/detail context.
- Doctor ID resolved to doctor name when practitioner data is available.
- Created date.
- Status.
- Number of medications/items.
- Medication display names.
- Per-item dose.
- Route.
- Frequency.
- Duration in days.
- Quantity.
- Instructions.
- Substitutes.
- Notes to pharmacy.

Evidence:

- `apps/patient/src/app/(dashboard)/health-records/page.tsx`.
- `apps/patient/src/app/(dashboard)/prescriptions/page.tsx`.
- `apps/patient/src/app/(dashboard)/prescriptions/[prescriptionId]/page.tsx`.
- `apps/patient/src/lib/api/patient-portal.ts` — `GET /prescriptions?patientId={patientId}`.

### Lab orders and lab reports

Lab Reports page displays:

- Pending results count/list.
- Completed results count/list.
- Ordering doctor ID/name when available.
- Ordered date.
- Reviewed date if available.
- Lab order status.
- Priority.
- Test names.
- Pending/awaiting result indicators.
- Completed test result text/value when present in `LabOrder.tests[].result`.

The frontend maps lab orders from FHIR ServiceRequest, including:

- Lab order ID.
- Patient ID.
- Encounter ID.
- Doctor ID.
- Priority.
- Status.
- Created timestamp.
- Sent-to-lab timestamp.
- Notes to lab.
- Test IDs/status/result.
- Review status.
- Show-results-to-patient flag.

Evidence:

- `apps/patient/src/app/(dashboard)/lab-reports/page.tsx`.
- `apps/patient/src/lib/api/patient-portal.ts` — `GET /lab-orders?patientId={patientId}`.
- `apps/patient/src/types/index.ts`.

### Appointments

Appointments page displays:

- Upcoming appointments.
- Past appointments.
- Appointment date.
- Appointment time.
- Reason for appointment.
- Status.
- Doctor ID/name when available.
- Visit type.
- Room when present.
- Notes for upcoming appointments.

Evidence:

- `apps/patient/src/app/(dashboard)/appointments/page.tsx`.
- `apps/patient/src/lib/api/patient-portal.ts` — `GET /appointments`.

### Visits/encounters

Visits list displays completed visit summaries:

- Chief complaint.
- Doctor ID/name when available.
- Visit/encounter started date.
- Encounter status.
- Diagnosis count.
- Prescription count.
- Lab order count.

The visit detail page does **not** show full notes. It displays a message that visit detail records are available to the care team and asks the patient to contact the clinic for a full copy.

FHIR encounter mapping can include:

- Patient ID.
- Doctor ID.
- Appointment ID.
- Period start/end.
- Chief complaint.
- SOAP extension fields.
- Diagnosis/prescription/lab IDs in type model.

But current patient detail page with route `/visits/[visitId]` does not render full SOAP or detailed notes.

Evidence:

- `apps/patient/src/app/(dashboard)/visits/page.tsx`.
- `apps/patient/src/app/(dashboard)/visits/[visitId]/page.tsx`.
- `apps/patient/src/lib/api/patient-portal.ts` — `GET /encounters/patient/{patientId}`.

### Dependents/guardians

No current dependent/guardian/family member feature was found in routes, components, types, or API helpers. The patient portal appears limited to the logged-in patient’s own data.

### Documents/files

No patient documents, scans, uploads, attachments, downloads, or file APIs were found in the patient portal.

## Patient portal caveats

- The portal can fetch encounter SOAP data through mappers, but the current visit detail UI intentionally does not render full notes.
- Doctor names may display as “unknown”/fallback unless practitioner data is loaded; some pages use empty doctor arrays.
- Lab result detail is limited to values embedded in lab order tests; no separate rich PDF/report document viewer was found.
- No dependents feature found.

---

# 4. `apps/lab/` — Lab frontend

## Summary

The lab portal is centered around lab worklists, orders, specimens/results entry, and patient lab history. Lab users can see patient identity sufficient for specimen/order processing, plus lab orders, test details, result values, flags, conclusions, instruments, and QC/test catalog data. The frontend has patient API helpers/types for broader demographics/allergies/conditions, but current lab UI mostly uses a subset.

Primary evidence:

- Lab API: `apps/lab/src/lib/api/lab.ts`.
- Patient API: `apps/lab/src/lib/api/patients.ts`.
- Worklist: `apps/lab/src/app/(dashboard)/worklist/page.tsx`, `components/features/worklist/WorklistTable.tsx`.
- Order detail: `apps/lab/src/app/(dashboard)/worklist/[orderId]/page.tsx`.
- Results entry: `apps/lab/src/app/(dashboard)/worklist/[orderId]/results/page.tsx`, `ResultsEntryForm.tsx`.
- Patient lab history: `apps/lab/src/app/(dashboard)/patients/[patientId]/page.tsx`.
- Data model: `apps/lab/src/types/index.ts`.

## Data visible to lab users

### Patient-identifying data rendered in current UI

Visible in worklist/order detail/results entry/patient lab history:

- Patient ID, used for lookup/linking.
- Full name.
- MRN/patient code.
- Age calculated from DOB.
- Sex.
- Blood type.
- Phone and email on lab patient detail page.

Evidence:

- `apps/lab/src/components/features/worklist/WorklistTable.tsx` — worklist shows patient name and MRN.
- `apps/lab/src/app/(dashboard)/worklist/[orderId]/page.tsx` — order detail shows name, MRN, age/sex, blood type.
- `apps/lab/src/app/(dashboard)/worklist/[orderId]/results/page.tsx` — results entry header shows order ID, patient name, MRN.
- `apps/lab/src/app/(dashboard)/patients/[patientId]/page.tsx` — patient header shows name, MRN, age/sex, blood type, phone, email.

### Patient-identifying data available in frontend object/API mapping but not prominent in lab UI

The `Patient` type/API mapper can carry:

- NIC.
- DOB.
- Nationality.
- Marital status.
- Address.
- Emergency contact.
- Allergies array.
- Problem list.
- Current medications.
- Tags.
- Created/updated timestamps.

Current lab screens do not prominently render all of these fields.

Evidence:

- `apps/lab/src/types/index.ts` — `Patient`.
- `apps/lab/src/lib/api/mappers.ts`.
- `apps/lab/src/lib/api/patients.ts`.

### Lab orders

Lab users can see/manage lab orders:

- Lab order ID.
- Patient ID.
- Encounter ID.
- Doctor/requester ID.
- Priority: routine/urgent/stat.
- Status: draft/sent_to_lab/results_pending/completed.
- Created timestamp.
- Sent-to-lab timestamp.
- Notes to lab.
- Tests ordered.
- Per-test status.
- Test count.
- Review status fields in type model.
- Show-results-to-patient flag in type model.

Visible in:

- Worklist table.
- Order detail page.
- Patient detail lab order history.

Evidence:

- `apps/lab/src/lib/api/lab.ts` — `GET /orders`, `GET /orders/{id}`, `PUT /orders/{id}/receive`, `POST /orders/scan`.
- `apps/lab/src/components/features/worklist/WorklistTable.tsx`.
- `apps/lab/src/app/(dashboard)/worklist/[orderId]/page.tsx`.
- `apps/lab/src/app/(dashboard)/patients/[patientId]/page.tsx`.

### Lab results/reports

Lab users can view and enter lab result data:

- Result ID.
- Order ID.
- Patient ID.
- Test code.
- Test name.
- Value.
- Unit.
- Reference range.
- Flag: normal/high/low/critical/abnormal.
- Notes per component in entry UI.
- Conclusion.
- Status.
- Performed at.
- Reported at.
- Performed by.
- Verified by.
- Instrument ID.
- Verified at.

Current UI details:

- Order detail page displays existing results with value, unit, reference range, flag, conclusion, and performed date.
- Results entry form lets users enter component values and notes, and auto-flags low/high/normal based on reference ranges.

Evidence:

- `apps/lab/src/lib/api/lab.ts` — `enterResults`, `getLabResultsByOrder`, `getLabResultsByPatient`.
- `apps/lab/src/app/(dashboard)/worklist/[orderId]/page.tsx`.
- `apps/lab/src/components/features/worklist/ResultsEntryForm.tsx`.
- `apps/lab/src/types/index.ts` — `LabResult`, `ResultValue`, `ResultFlag`.

### Test catalog/specimen/instrument/QC data linked to patient work

Lab users can see test catalog and operational lab data:

- Test code/name/category/department.
- Specimen type.
- Container type.
- Turnaround time.
- Price in catalog type/data.
- Panel/components.
- Component units and reference ranges.
- Instruments:
  - name
  - model
  - serial number
  - status
  - calibration dates
  - location
  - type/department
- QC logs:
  - instrument ID
  - test code
  - control level
  - expected/observed values
  - unit
  - pass/fail/warning status
  - performed by/at
  - notes

Some of this is operational rather than patient-specific, but it can be attached to patient result generation.

Evidence:

- `apps/lab/src/types/index.ts` — `LabTestCatalogItem`, `LabInstrument`, `QCLog`.
- `apps/lab/src/data/lab-tests.json`.
- `apps/lab/src/app/(dashboard)/test-catalog/page.tsx`.
- `apps/lab/src/app/(dashboard)/qc/page.tsx`.

### Allergies/problems/medications/encounters

The lab frontend has shared types and patient API helpers for allergies and conditions:

- `GET /patients/{patientId}/allergies`.
- `GET /patients/{patientId}/conditions`.

However, current lab screens reviewed do not render allergy banners, problem lists, prescriptions, SOAP notes, or encounter details beyond lab-order encounter IDs/references.

### Billing/insurance/payment

No patient insurance, payment, invoice, balance, claim, or receipt UI was found in current lab screens. Test catalog may include a `price` field, but that is catalog/operational and not patient billing in the current UI.

### Documents/files

No patient documents, uploads, attachments, scans, PDFs, or file download UI/API was found.

## Lab caveats

- Lab pages often fetch whole `Patient` objects to display a small subset; the frontend may receive more mapped patient fields than it renders.
- Current result entry form shows demo-mode toasts for save/submit in inspected code; actual persistence depends on backend/API integration.
- Lab result access is broad for lab users: they can see and enter result values/flags/conclusions for orders.

---

# 5. `apps/pharmacy/` — Pharmacy frontend

## Summary

The pharmacy portal is focused on prescriptions, dispensing, patient prescription history, and medication stock. Pharmacy users can see patient identity/contact data relevant to prescription dispensing, allergy/current-medication alerts, prescription medication details, dispense records, receipts/totals, and medication inventory/stock. They do not see lab results, SOAP notes, detailed conditions, documents, or full appointment history in current screens.

Primary evidence:

- Pharmacy API: `apps/pharmacy/src/lib/api/pharmacy.ts`.
- Patient API: `apps/pharmacy/src/lib/api/patients.ts`.
- Prescription list/table: `apps/pharmacy/src/app/(dashboard)/prescriptions/page.tsx`, `components/features/prescriptions/PrescriptionTable.tsx`.
- Patient directory/detail: `apps/pharmacy/src/app/(dashboard)/patients/page.tsx`, `components/features/patients/PatientList.tsx`, `app/(dashboard)/patients/[patientId]/page.tsx`.
- Prescription detail/dispense: `apps/pharmacy/src/app/(dashboard)/prescriptions/[prescriptionId]/page.tsx`.
- Type model: `apps/pharmacy/src/types/index.ts`.

## Data visible to pharmacy users

### Patient-identifying data

Visible in patient directory, prescription list, patient detail:

- Patient ID, used in route/API lookup.
- MRN/patient code.
- Full name.
- NIC in patient directory search and patient detail header.
- Date of birth used to calculate age.
- Age.
- Sex.
- Blood type.
- Phone.
- Email in patient detail.
- Patient tags in type model.

Evidence:

- `apps/pharmacy/src/components/features/patients/PatientList.tsx` — search by name, MRN, NIC, phone; displays name, MRN, age/sex, allergies, last prescription, total Rx.
- `apps/pharmacy/src/app/(dashboard)/patients/[patientId]/page.tsx` — patient header shows name, MRN, age/sex, NIC, blood type, phone, email.
- `apps/pharmacy/src/components/features/prescriptions/PrescriptionTable.tsx` — prescription list displays patient name.
- `apps/pharmacy/src/types/index.ts` — `Patient` fields.

### Contact/address/emergency contact

The pharmacy `Patient` type/API mapper can carry:

- Phone.
- Email.
- Address line/city/district/postal/country.
- Emergency contact name/relationship/phone.

Current pharmacy UI visibly shows phone and email in patient detail; it does not prominently render full address or emergency contact in the inspected pages.

Evidence:

- `apps/pharmacy/src/types/index.ts`.
- `apps/pharmacy/src/app/(dashboard)/patients/[patientId]/page.tsx`.
- `apps/pharmacy/src/lib/api/mappers.ts`.

### Allergies and current medications

Visible on patient list/detail:

- Allergy names/list from `patient.allergies`.
- Current medication names/list from `patient.currentMedications`.

The pharmacy API client also has helpers for detailed allergy and condition endpoints, but current pharmacy screens do not appear to use the detailed conditions/problem list.

Evidence:

- `apps/pharmacy/src/components/features/patients/PatientList.tsx`.
- `apps/pharmacy/src/app/(dashboard)/patients/[patientId]/page.tsx`.
- `apps/pharmacy/src/lib/api/patients.ts` — `getAllergies`, `getConditions` exist.

### Prescriptions and medication details

Pharmacy users can see prescription data:

- Prescription ID.
- Patient ID.
- Encounter ID.
- Doctor ID.
- Status.
- Created date.
- Sent date.
- Medication items:
  - medication ID/code
  - display name
  - dose
  - route
  - frequency
  - duration days
  - quantity
  - instructions
  - substitutes
- Notes to pharmacy.

Visible in:

- Prescriptions list.
- Patient detail prescription tab/history.
- Prescription detail context.

Evidence:

- `apps/pharmacy/src/lib/api/pharmacy.ts` — `GET /prescriptions/pending`, `GET /prescriptions?patientId={id}`.
- `apps/pharmacy/src/components/features/prescriptions/PrescriptionTable.tsx`.
- `apps/pharmacy/src/app/(dashboard)/patients/[patientId]/page.tsx`.
- `apps/pharmacy/src/types/index.ts`.

### Dispensing records and payment-like data

Pharmacy users can see dispensing/receipt records:

- Dispense record ID.
- Prescription ID.
- Patient ID.
- Dispensed by.
- Verified by in type model.
- Dispensed timestamp.
- Receipt number.
- Dispensed items:
  - medication name
  - quantity
  - unit price
  - subtotal
  - batch/expiry/substitution/notes in broader type model
- Counselling notes in broader type model.
- Printed instructions flag in broader type model.
- Total amount.

Visible in:

- Patient detail dispensing history.
- Prescription detail/dispense page.
- Dispensing log/reports.

Evidence:

- `apps/pharmacy/src/lib/api/pharmacy.ts` — `POST /dispense`, `GET /dispense`, `GET /dispense?patientId=...`, `GET /dispense?prescriptionId=...`.
- `apps/pharmacy/src/app/(dashboard)/patients/[patientId]/page.tsx`.
- `apps/pharmacy/src/app/(dashboard)/prescriptions/[prescriptionId]/page.tsx`.
- `apps/pharmacy/src/types/index.ts` — `DispensingRecord`, `DispensingItem`.

This is not full patient billing, but it is payment/receipt-like medication transaction data.

### Inventory/stock data indirectly related to patients

Pharmacy users can see medication stock information:

- Medication name/generic/brand.
- Form/strength.
- Quantity.
- Reorder threshold.
- Unit cost.
- Expiry date.
- Batch number.
- Supplier.
- Location.
- Active flag.
- Controlled substance / requires prescription in type model.

This is not patient data by itself, but it is linked to dispensing patient prescriptions.

Evidence:

- `apps/pharmacy/src/lib/api/pharmacy.ts` — `GET /stock`, `GET /stock/alerts`, `PUT /stock/{id}`, `POST /stock`.
- `apps/pharmacy/src/types/index.ts`.

### Appointments/encounters/labs

Pharmacy prescription data includes `encounterId`, but current pharmacy UI does not show encounter notes, SOAP, appointment details, diagnoses, or lab results. Lab data is not surfaced in current pharmacy screens.

### Insurance/billing

The pharmacy `Patient` type has a simplified insurance object with provider and policy number, but current pharmacy UI did not prominently render insurance details. Dispensing records expose receipt/totals/subtotals.

### Documents/files

No patient documents, uploads, downloads, attachments, or file APIs were found. “FileText” icons are used for logs/history only.

## Pharmacy caveats

- Prescription detail page comments note there is no direct `GET /prescriptions/:id`; it loads dispensing records by prescription ID and can dispense by prescription ID.
- Pharmacy patient API helpers can fetch allergies/conditions, but visible pages mostly use patient summary arrays and prescription/dispense data.
- Payment exposure is limited to dispense totals/receipt-like data, not full billing/insurance workflows.

---

# Cross-frontend observations

## Data minimization observations

- **Doctor** has clinically broad access, as expected for charting: demographics, allergies, problems, encounter summaries, SOAP/vitals entry, prescriptions, labs, schedule.
- **Receptionist** has broad administrative access: demographics/contact/emergency/insurance/appointments/queue. Clinical exposure is mostly limited to allergy alerts; deeper clinical data is not currently shown.
- **Patient** has access to own profile, health records, prescriptions, lab reports, appointments, and visit summaries. Full visit notes are intentionally withheld in current UI.
- **Lab** has strong access to lab-order/result data and enough demographics for specimen handling. Broader demographics may be fetched but not all rendered.
- **Pharmacy** has strong access to prescription/dispensing data and enough demographics/allergy/current-medication data for safe dispensing. It does not show broader chart/lab data.

## No document/file access found

Across all five frontends, I did not find patient document/file upload/download screens, scanned files, attachments, PDFs, or document API clients.

## Backend authorization remains the deciding control

Because frontend apps can include API helpers/types that are not actively rendered, and because client-side route protection does not prove backend authorization, the definitive access boundary should be verified in backend services/gateway policies. This report should be treated as the frontend exposure map, not a complete security authorization audit.

## Source artifacts

Detailed subagent findings are saved in:

- `analysis/pharmacy-patient-data.md`
- `analysis/doctor-patient-data.md`
- `analysis/patient-patient-data.md`
- `analysis/lab-patient-data.md`
- `analysis/receptionist-patient-data.md`
