CuroMD EMR Doctor Dashboard - Task Plan
1. Project Initialization & Setup
 Initialize Next.js project with App Router, TypeScript, and Tailwind CSS.
 Setup shadcn/ui generic components (button, input, card, dialog, table, badge, etc.).
 Define global CSS and Tailwind theme (clean, minimal, shades of blue, light mode).
2. Data Access Layer & Mock Data
 Create /data directory and populate mock JSON files (patients, encounters, appointments, icd10, medications, prescriptions, lab-tests, lab-orders, allergies, problems).
 Create TypeScript types/interfaces (/types/*.ts) for all entities.
 Create data layer functions in /lib/data/ to read/write from mock data (simulated API).
3. Core Layout & Navigation
 Create main App Layout with left sidebar navigation.
 Create top bar with global search (patients, ICD, meds, labs).
4. Doctor Dashboard (Home)
 Implement Today's Schedule / Worklist (with visit statuses).
 Implement Pending Results / Follow-ups list.
 Implement Tasks & Messages.
 Implement Recent Patients quick links.
5. Patient Directory & Chart
 Implement Patient Search / Directory page.
 Implement Patient Chart layout (Header summary, Clinical Alerts).
 Implement Patient Chart tabs (Overview, Encounters, Allergies, Meds, Problems, Labs).
6. Encounter Workflow
 Implement Encounter Details View (read-only SOAP, Vitals, Diagnoses, Meds, Labs).
 Implement "Start New Visit" editor (In progress encounter).
 Implement SOAP Note Entry form.
 Implement Vitals & Measurements input (with auto BMI).
 Implement ICD Code Lookup & Selection.
 Implement e-Prescriptions feature (add meds, substitutes, send to pharmacy).
 Implement Lab Order creation (select tests, priority, send to lab).
7. Polishing & Review
 Ensure all required UX/UI constraints are met (≤ 2 clicks from dashboard, minimal UI, clear empty states).
 Validate responsive design and accessibility.
 Final manual verification.