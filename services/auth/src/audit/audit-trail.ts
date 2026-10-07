import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '@curo/shared/database';
import type { AuthUser } from '@curo/shared/auth';

/** What was done, to which record; who did it comes from the actor. */
export type AuditEntry = Omit<Partial<AuditLog>, 'userId' | 'userRole'>;

/** Records the admin actions taken through this service in the audit log. */
@Injectable()
export class AuditTrail {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async record(actor: AuthUser, entry: AuditEntry): Promise<void> {
    await this.auditRepo.save(
      this.auditRepo.create({
        outcome: 'success',
        ...entry,
        userId: actor.userId,
        userRole: actor.role,
      }),
    );
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditTrail],
  exports: [AuditTrail],
})
export class AuditTrailModule {}
