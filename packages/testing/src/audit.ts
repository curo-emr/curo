import { AuditLog } from '@curo/shared/database';
import type { ServiceUnderTest } from './start-service';

/** The audit entries a service wrote about one record, oldest first. */
export function auditOf(
  svc: Pick<ServiceUnderTest, 'db'>,
  resourceId: string,
): Promise<AuditLog[]> {
  return svc.db.getRepository(AuditLog).find({
    where: { resourceId },
    order: { createdAt: 'ASC' },
  });
}
