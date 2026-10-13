import { BadRequestException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';

/**
 * Throws 400 unless `patientId` names a registered, active patient: the check
 * a service makes before it records anything for a patient it was only given
 * the id of.
 */
export async function assertPatientOnFile(
  db: DataSource | EntityManager,
  patientId: string,
): Promise<void> {
  const rows = await db.query<unknown[]>(
    'SELECT 1 FROM patients WHERE id = $1 AND active',
    [patientId],
  );
  if (!rows.length)
    throw new BadRequestException(`Patient ${patientId} isn't on file`);
}
