import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Exclusion,
} from 'typeorm';
import { AppointmentStatus } from '../enums';

/**
 * A doctor can't have two live appointments at overlapping times. The database
 * enforces it, so two desks booking the same slot at once can't both succeed.
 * Cancelled, no-show and wait-listed appointments don't hold their slot.
 */
export const NO_DOUBLE_BOOKING = 'appointments_no_double_booking';

@Entity('appointments')
@Exclusion(
  NO_DOUBLE_BOOKING,
  `USING gist ("practitionerId" WITH =, tsrange("start", "end") WITH &&) WHERE (status NOT IN ('cancelled', 'noshow', 'waitlist'))`,
)
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Index()
  @Column()
  practitionerId: string;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.BOOKED,
  })
  status: AppointmentStatus;

  @Column()
  start: Date;

  @Column()
  end: Date;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  serviceType: string;

  @Column({ nullable: true })
  reasonCode: string;

  @Column({ nullable: true })
  comment: string;

  @Column({ nullable: true })
  slotNumber: number;

  @Column({ nullable: true })
  encounterId: string;

  @Column({ default: false })
  isWalkIn: boolean;

  @Column({ nullable: true })
  cancelledReason: string;

  // Position in the day's patient flow (a QueueStage value); null = not in the flow.
  // Plain varchar rather than a Postgres enum so stages can be appended safely.
  @Index()
  @Column({ type: 'varchar', nullable: true })
  queueStage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
