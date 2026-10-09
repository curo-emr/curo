import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { DoctorSession } from '../entities/doctor-session.entity';
import { SessionDto } from './dto/set-sessions.dto';
import { sessionProblem } from './sessions';

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

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(DoctorSession)
    private sessionsRepo: Repository<DoctorSession>,
    private dataSource: DataSource,
  ) {}

  /** The weekly sessions of the doctors asked for, or of every doctor. */
  async list(practitionerIds: string[] = []) {
    const sessions = await this.sessionsRepo.find({
      where: practitionerIds.length
        ? { practitionerId: In(practitionerIds) }
        : {},
      order: { practitionerId: 'ASC', weekday: 'ASC', startTime: 'ASC' },
    });
    return sessions.map(toSession);
  }

  /** Replaces a doctor's week with `sessions`, all or nothing. */
  async replace(practitionerId: string, sessions: SessionDto[]) {
    const problem = sessionProblem(sessions);
    if (problem) throw new BadRequestException(problem);

    await this.dataSource.transaction(async (tx) => {
      const repo = tx.getRepository(DoctorSession);
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
    });
    return this.list([practitionerId]);
  }
}
