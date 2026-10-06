import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AppointmentStatus } from '../enums';

@Entity('appointments')
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
