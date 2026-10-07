# Curo EMR — Test Account Credentials

> ⚠️ **Development seed data only.** These accounts and passwords are created by
> `database/seed.ts` for local testing. **Never use them in production.** Passwords are
> stored bcrypt-hashed; the plaintext values below are hardcoded in the seed script.

All logins go through the gateway: `POST http://localhost:3000/auth/login` with
`{ "email": "...", "password": "..." }`. The portals (below) use the same accounts.

## Portals (frontends)

| Portal | URL | Who logs in |
|---|---|---|
| Doctor | http://localhost:3010 | doctors |
| Patient | http://localhost:3011 | patients |
| Receptionist | http://localhost:3012 | receptionists |
| Lab | http://localhost:3013 | lab staff |
| Pharmacy | http://localhost:3014 | pharmacists |
| Admin | http://localhost:3015 | super admin |
| Nurse Station | http://localhost:3016 | nursing officers |

## Staff accounts

| Role | Email | Password | Name / detail |
|---|---|---|---|
| SUPER_ADMIN | `admin@curo.health` | `Admin@12345` | System administrator |
| DOCTOR | `dr.priya@curo.health` | `Doctor@123` | Priya Rajapaksa — General Medicine (SLMC-001) |
| DOCTOR | `dr.ashan@curo.health` | `Doctor@123` | Ashan Fernando — Cardiology (SLMC-002) |
| DOCTOR | `dr.nimal@curo.health` | `Doctor@123` | Nimal Perera — Pediatrics (SLMC-003) |
| RECEPTIONIST | `chamali@curo.health` | `Recept@123` | Chamali Silva |
| RECEPTIONIST | `dinesh@curo.health` | `Recept@123` | Dinesh Wijeratne |
| PHARMACIST | `kasun.pharma@curo.health` | `Pharma@123` | Kasun Bandara (Curo Pharmacy — Colombo) |
| PHARMACIST | `niluka.pharma@curo.health` | `Pharma@123` | Niluka Mendis (Curo Pharmacy — Kandy) |
| LAB_STAFF | `tharindi.lab@curo.health` | `LabStaff@123` | Tharindi Jayawardena |
| LAB_STAFF | `rukshan.lab@curo.health` | `LabStaff@123` | Rukshan Gunasekara |
| NURSE | `nimasha@curo.health` | `Nurse@123` | Nimasha Herath — Nursing Officer |
| NURSE | `ruwan@curo.health` | `Nurse@123` | Ruwan Ekanayake — Nursing Officer |

## Patient accounts

All patients share the password **`Patient@123`**.

| Email | Name | Notes |
|---|---|---|
| `samantha@email.com` | Samantha Wijesekara | Has conditions + vitals trend data (good demo patient) |
| `roshan@email.com` | Roshan Kumara | Has glucose/cholesterol trend series |
| `amali@email.com` | Amali Dissanayake | |
| `tharaka@email.com` | Tharaka Pathirana | |
| `ishani@email.com` | Ishani Rajapaksa | |
| `buddhika@email.com` | Buddhika Senanayake | |
| `malsha@email.com` | Malsha Jayasinghe | |
| `lasantha@email.com` | Lasantha Gunatilake | |
| `nadeeka@email.com` | Nadeeka Wickramasinghe | |
| `chanuka@email.com` | Chanuka Madusanka | |
| `sehan.guardian@email.com` | Sehan Perera | Minor (DOB 2018-05-04), **no NIC** — identified by PHN only |

## Useful seeded data for testing

- **Organizations (5):** Curo Central Clinic (clinic); Curo Pharmacy — Colombo & Kandy;
  Curo Diagnostics — Colombo & Galle. `GET /organizations` lists them.
- **Appointments:** 20 seeded (10 past fulfilled/noshow, 10 future booked) across patients × doctors.
- **Today's patient flow (fresh seed only):** 5 appointments for the seed day spread across queue
  stages — 2 waiting for the nurse, 1 ready for the doctor with nurse triage vitals (BP 152/96),
  1 with the doctor, 1 done. Nurses are added to existing volumes automatically (seed top-ups);
  on an existing volume, create today's queue by checking a patient in from reception.
- **Encounters:** 10, each with a SOAP note + 5 vital observations.
- **Prescriptions:** 8 (Metformin, Amlodipine, Atorvastatin, Omeprazole, Salbutamol, Losartan,
  Paracetamol, Amoxicillin) — first 5 completed, rest active (visible in the pharmacy pending queue).
- **Lab orders:** 8 with QR codes (CBC, CMP, Lipid, HbA1c, PT, Fasting Glucose, LDH, TSH) — first
  5 completed with diagnostic reports.
- **Pharmacy stock:** ~31 rows; 3 multi-batch drugs (paracetamol, amoxicillin, omeprazole) for the
  FEFO demo; some intentionally below reorder threshold (amoxicillin, pantoprazole, furosemide) so
  `GET /stock/alerts` returns results.
- **Lab instruments:** Sysmex XN-550, Beckman AU480.

## Re-seeding

The seed is idempotent (aborts if `admin@curo.health` already exists). To wipe and reseed:

```bash
docker compose down -v && docker compose up -d --build
```
