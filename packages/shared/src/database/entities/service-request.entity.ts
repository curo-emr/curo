import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ServiceRequestStatus } from '../../enums';

/** One test inside a lab panel order. */
export interface LabPanelTest {
  code: string; // LOINC
  display: string;
}

@Entity('service_requests')
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column()
  requesterId: string; // doctor ordering

  @Column({ nullable: true })
  encounterId: string;

  @Column({ nullable: true })
  performerId: string; // lab staff assigned

  // The lab the doctor sent the test to: only its staff see and work on it.
  // Null only on orders placed before tests were sent to a lab.
  @Index()
  @Column({ nullable: true })
  performerOrganizationId: string;

  @Column({
    type: 'enum',
    enum: ServiceRequestStatus,
    default: ServiceRequestStatus.ACTIVE,
  })
  status: ServiceRequestStatus;

  @Column({ nullable: true })
  intent: string; // order | plan | proposal

  @Column({ nullable: true })
  category: string; // laboratory | imaging | etc.

  @Column()
  code: string; // lab test code / LOINC

  @Column()
  display: string; // human-readable test name

  @Column({ type: 'jsonb', nullable: true })
  testPanel: LabPanelTest[] | null;

  @Column({ nullable: true })
  priority: string; // routine | urgent | asap | stat

  @Column({ nullable: true })
  reasonCode: string;

  @Column({ nullable: true })
  note: string;

  @Column({ nullable: true })
  qrCodeId: string;

  @Column({ type: 'timestamptz', nullable: true })
  authoredOn: Date;

  @Column({ type: 'timestamptz', nullable: true })
  occurrenceDateTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  receivedAt: Date; // when lab received the sample

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
