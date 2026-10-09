import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * One weekly session in which a doctor sees patients, e.g. Mondays 16:00–19:00
 * in room 3. A doctor may have several a day (morning and evening). Times are
 * the clinic's clock times; the portals turn them into the day's slots.
 */
@Entity('doctor_sessions')
@Check(`"startTime" < "endTime"`)
@Check(`"weekday" BETWEEN 0 AND 6`)
export class DoctorSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  practitionerId: string;

  /** 0 = Sunday … 6 = Saturday, as JavaScript's `Date#getDay`. */
  @Column({ type: 'smallint' })
  weekday: number;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  /** How long each appointment in the session is. */
  @Column({ type: 'smallint' })
  slotMinutes: number;

  @Column({ type: 'varchar', nullable: true })
  room: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
