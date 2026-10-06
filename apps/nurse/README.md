# Curo — Nurse Station (`curo-nurse`)

Nursing-officer portal for pre-visit triage. Port **3016**.

- **Dashboard** — today's patient flow (waiting → in triage → ready for doctor → with doctor → done), up-next list, wait times.
- **Triage queue** (`/triage`) — checked-in patients waiting for triage; start / resume triage, skip straight to the doctor, re-open vitals until the doctor starts the visit. Polls every 15 s.
- **Triage** (`/triage/[appointmentId]`) — allergies and conditions up front, vital-sign tiles flagged against normal ranges as you type, BMI, last recorded values. *Save & send to doctor* records one FHIR Observation per vital, linked to the appointment, and moves the patient to `ready_for_doctor`; the doctor sees them prefilled in the visit.

Only `NURSE` (and `SUPER_ADMIN`) accounts can sign in. Seed users: `nimasha@curo.health` / `Nurse@123`, `ruwan@curo.health` / `Nurse@123`.

```bash
npm install
npm run dev        # http://localhost:3016 (API gateway at NEXT_PUBLIC_API_URL, default http://localhost:3000)
npm run build
```
