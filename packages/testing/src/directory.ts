import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { UserRole } from '@curo/shared/enums';

/** A registered patient, as the patient service saves one; returns its id. */
export async function registerPatient(
  db: DataSource,
  id: string = randomUUID(),
): Promise<string> {
  await db.query(
    `INSERT INTO patients (id, "patientCode", "firstName", "lastName")
     VALUES ($1, $2, 'Test', 'Patient')`,
    [id, `TEST-${id}`],
  );
  return id;
}

/**
 * A practitioner with `role` in the staff directory, as the auth service saves
 * one (e.g. for a test actor's `practitionerId`); returns its id.
 */
export async function addPractitioner(
  db: DataSource,
  role: UserRole,
  id: string = randomUUID(),
): Promise<string> {
  await db.query(
    `INSERT INTO practitioners (id, "firstName", "lastName", role)
     VALUES ($1, 'Test', 'Practitioner', $2)`,
    [id, role],
  );
  return id;
}

/** A lab or pharmacy, as the auth service keeps them; returns its id. */
export async function addOrganization(
  db: DataSource,
  type: 'laboratory' | 'pharmacy',
  active = true,
): Promise<string> {
  const id = randomUUID();
  await db.query(
    `INSERT INTO organizations (id, name, type, active) VALUES ($1, $2, $3, $4)`,
    [id, `Curo ${type} ${id}`, type, active],
  );
  return id;
}

/** A drug in the medication catalog, as the pharmacy service keeps it; returns its code. */
export async function addCatalogDrug(
  db: DataSource,
  { name = 'Amoxicillin 500mg Capsule', active = true } = {},
): Promise<string> {
  const id = `TEST-${randomUUID()}`;
  await db.query(
    `INSERT INTO medication_catalog (id, name, "genericName", form, strength, active)
     VALUES ($1, $2, 'Amoxicillin', 'capsule', '500mg', $3)`,
    [id, name, active],
  );
  return id;
}
