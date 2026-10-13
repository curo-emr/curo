import { UserRole } from '@curo/shared/enums';
import { addPractitioner, type ServiceUnderTest } from '@curo/testing';
import { DoctorSession } from '../src/entities/doctor-session.entity';

/** A session's clock hours, as the database keeps them. */
type Hours = Pick<DoctorSession, 'startTime' | 'endTime'>;

/** Every day, all day: any time can be booked unless it crosses midnight. */
export const ALL_DAY: Hours = { startTime: '00:00', endTime: '23:59' };

/**
 * A doctor who sees patients during `hours` every day of the week; returns
 * their practitioner id (`id`, e.g. a test actor's, or a new one).
 */
export async function doctorWithSessions(
  svc: ServiceUnderTest,
  { id, hours = ALL_DAY }: { id?: string; hours?: Hours } = {},
): Promise<string> {
  const practitionerId = await addPractitioner(svc.db, UserRole.DOCTOR, id);
  await svc.db.getRepository(DoctorSession).save(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      practitionerId,
      weekday,
      ...hours,
      slotMinutes: 15,
    })),
  );
  return practitionerId;
}
