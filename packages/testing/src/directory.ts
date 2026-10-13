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
