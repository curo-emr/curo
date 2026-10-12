import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { AuthUser } from '@curo/shared/auth';
import { AuditTrail } from '@curo/shared/audit';
import { DoctorSession } from '../entities/doctor-session.entity';
import { SessionDto } from './dto/set-sessions.dto';
import { sessionProblem, weekChange } from './sessions';

/** A session as the API gives it: clock times as "HH:MM". */
function toSession(s: DoctorSession) {
  return {
    practitionerId: s.practitionerId,
    weekday: s.weekday,
    start: s.startTime.slice(0, 5),
    end: s.endTime.slice(0, 5),
    slotMinutes: s.slotMinutes,
    room: s.room,
  };
}

/** `list` on any repository, so `replace` can read a week inside its transaction. */
async function weeksOf(
  repo: Repository<DoctorSession>,
  practitionerIds: string[] = [],
) {
  const sessions = await repo.find({
    where: practitionerIds.length
      ? { practitionerId: In(practitionerIds) }
      : {},
    order: { practitionerId: 'ASC', weekday: 'ASC', startTime: 'ASC' },
  });
  return sessions.map(toSession);
}

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(DoctorSession)
    private sessionsRepo: Repository<DoctorSession>,
    private dataSource: DataSource,
    private auditTrail: AuditTrail,
  ) {}

  /** The weekly sessions of the doctors asked for, or of every doctor. */
  list(practitionerIds: string[] = []) {
    return weeksOf(this.sessionsRepo, practitionerIds);
  }

  /**
   * Replaces a doctor's week with `sessions`, all or nothing, and records the
   * change in the audit log in the same transaction.
   */
  async replace(
    practitionerId: string,
    sessions: SessionDto[],
    actor: AuthUser,
  ) {
    const problem = sessionProblem(sessions);
    if (problem) throw new BadRequestException(problem);

    await this.dataSource.transaction(async (tx) => {
      const repo = tx.getRepository(DoctorSession);
      const before = await weeksOf(repo, [practitionerId]);
      await repo.delete({ practitionerId });
      await repo.save(
        sessions.map((s) =>
          repo.create({
            practitionerId,
            weekday: s.weekday,
            startTime: s.start,
            endTime: s.end,
            slotMinutes: s.slotMinutes,
            room: s.room?.trim() || null,
          }),
        ),
      );
      const after = await weeksOf(repo, [practitionerId]);
      const change = weekChange(before, after);
      if (!change) return;

      await this.auditTrail.record(
        actor,
        {
          action: 'UPDATE',
          resourceType: 'Schedule',
          resourceId: practitionerId,
          changes: { before, after },
          outcomeDescription: `Admin ${change}`,
        },
        tx,
      );
    });
    return this.list([practitionerId]);
  }
}
