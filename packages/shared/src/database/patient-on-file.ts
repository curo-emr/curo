import { BadRequestException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';

/**
 * Whether `patientId` names a registered, active patient: the check a service
 * makes before it records anything for a patient it was only given the id of.
 */
export async function patientIsOnFile(
  db: DataSource | EntityManager,
  patientId: string,
): Promise<boolean> {
  const rows = await db.query<unknown[]>(
    'SELECT 1 FROM patients WHERE id = $1 AND active',
    [patientId],
  );
  return rows.length > 0;
}

/** Throws 400 unless `patientId` names a registered, active patient. */
export async function assertPatientOnFile(
  db: DataSource | EntityManager,
  patientId: string,
): Promise<void> {
  if (!(await patientIsOnFile(db, patientId)))
    throw new BadRequestException(`Patient ${patientId} isn't on file`);
}
