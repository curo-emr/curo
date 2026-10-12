import { Injectable, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';
import type { AuthUser } from '../auth';

/** What was done, to which record; who did it comes from the actor. */
export type AuditEntry = Pick<
  AuditLog,
  'action' | 'resourceType' | 'resourceId'
> &
  Partial<Pick<AuditLog, 'patientId' | 'changes' | 'outcomeDescription'>>;

/** The record an entry is about, and the patient it belongs to. */
export type AuditTarget = Pick<
  AuditEntry,
  'resourceType' | 'resourceId' | 'patientId'
>;

/** `record`, of type `resourceType`, as an audit target. */
export function auditTarget(
  resourceType: string,
  record: { id: string; patientId?: string | null },
): AuditTarget {
  return {
    resourceType,
    resourceId: record.id,
    patientId: record.patientId ?? undefined,
  };
}

/**
 * An update's `changes`: the fields `update` sets, as they were on `record`
 * and as they are set; a field left undefined isn't set. Take it before
 * applying the update.
 */
export function changeOf<T extends object>(
  record: T,
  update: Partial<T>,
): Record<string, unknown> {
  const fields = (Object.keys(update) as (keyof T)[]).filter(
    (f) => update[f] !== undefined,
  );
  const pick = (from: Partial<T>) =>
    Object.fromEntries(fields.map((f) => [f, from[f]]));
  return { before: pick(record), after: pick(update) };
}

/**
 * Records what users do to the records a service holds: every change, and
 * every read of a patient's data. Given the caller's EntityManager, an entry
 * is saved inside its transaction: with the change it records, or not at all.
 * Otherwise it is saved straight after the change, and a failure to save it
 * fails the request rather than being ignored.
 */
@Injectable()
export class AuditTrail {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  /** Records `actor` doing what `entries` say, one entry per record. */
  async record(
    actor: AuthUser,
    entries: AuditEntry | AuditEntry[],
    manager?: EntityManager,
  ): Promise<void> {
    const list = Array.isArray(entries) ? entries : [entries];
    if (!list.length) return;
    const repo = manager?.getRepository(AuditLog) ?? this.auditRepo;
    await repo.save(
      list.map((entry) =>
        repo.create({
          outcome: 'success',
          ...entry,
          userId: actor.userId,
          userRole: actor.role,
        }),
      ),
    );
  }

  /** Records `actor` opening one record. */
  read(actor: AuthUser, target: AuditTarget): Promise<void> {
    return this.record(actor, { action: 'READ', ...target });
  }

  /**
   * Records `actor` reading a list of one patient's `records` ("visits") as
   * one entry on the patient. Lists across patients (a work queue, a day's
   * appointments) aren't reads of a patient's record, so `patientId`
   * undefined records nothing.
   */
  async readPatient(
    actor: AuthUser,
    patientId: string | undefined,
    records: string,
  ): Promise<void> {
    if (!patientId) return;
    await this.record(actor, {
      action: 'READ',
      ...auditTarget('Patient', { id: patientId, patientId }),
      outcomeDescription: `Read the patient's ${records}`,
    });
  }
}

/** Provides `AuditTrail`; the service must also list `AuditLog` in its entities. */
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditTrail],
  exports: [AuditTrail],
})
export class AuditTrailModule {}
