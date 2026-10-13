import type { DataSource, EntityManager } from 'typeorm';

/** Who a patient is, as a notice or a printed report names them. */
export interface PatientIdentity {
  name: string;
  patientCode: string;
  birthDate: string | null;
}

/**
 * The patient `patientId` names, or null for one not on file. Ids are compared
 * as text, so a malformed id finds no one rather than throwing and rolling
 * back the caller's transaction.
 */
export async function findPatientIdentity(
  db: DataSource | EntityManager,
  patientId: string,
): Promise<PatientIdentity | null> {
  const [patient] = await db.query<PatientIdentity[]>(
    `SELECT concat_ws(' ', "firstName", "lastName") AS name,
            "patientCode", "birthDate"::text AS "birthDate"
     FROM patients WHERE id::text = $1`,
    [patientId],
  );
  return patient ?? null;
}

/** "Anoma Perera (CUR-…)", or "patient <id>" for a patient not on file. */
export const patientLabel = (
  patient: PatientIdentity | null,
  patientId: string,
): string =>
  patient ? `${patient.name} (${patient.patientCode})` : `patient ${patientId}`;
