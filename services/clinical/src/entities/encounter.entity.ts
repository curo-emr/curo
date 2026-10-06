import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EncounterStatus } from '../enums';

@Entity('encounters')
export class Encounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Index()
  @Column()
  practitionerId: string;

  @Column({ nullable: true })
  appointmentId: string;

  @Column({
    type: 'enum',
    enum: EncounterStatus,
    default: EncounterStatus.IN_PROGRESS,
  })
  status: EncounterStatus;

  @Column({ nullable: true })
  classCode: string; // ambulatory | emergency | inpatient | etc.

  @Column({ nullable: true })
  serviceType: string;

  @Column({ nullable: true })
  priority: string;

  @Column({ type: 'timestamptz', nullable: true })
  periodStart: Date;

  @Column({ type: 'timestamptz', nullable: true })
  periodEnd: Date;

  @Column({ nullable: true })
  reasonCode: string;

  @Column({ nullable: true })
  dischargeDisposition: string;

  @Column({ type: 'jsonb', nullable: true })
  fhirExtensions: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
