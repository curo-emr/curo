import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';
import { ObservationStatus } from '../enums';

@Entity('observations')
export class Observation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column()
  practitionerId: string;

  @Column({ nullable: true })
  encounterId: string;

  @Index()
  @Column({ nullable: true })
  appointmentId: string; // links pre-encounter (nurse triage) vitals to the visit

  @Column({ nullable: true })
  performerRole: string; // role of whoever recorded it, e.g. NURSE | DOCTOR

  @Column({ nullable: true })
  serviceRequestId: string;

  @Column({ type: 'enum', enum: ObservationStatus, default: ObservationStatus.FINAL })
  status: ObservationStatus;

  @Column({ nullable: true })
  category: string;

  @Column()
  code: string;

  @Column()
  display: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  valueQuantity: number;

  @Column({ nullable: true })
  valueUnit: string;

  @Column({ nullable: true })
  valueString: string;

  @Column({ nullable: true })
  interpretation: string;

  @Column({ nullable: true })
  referenceRangeLow: string;

  @Column({ nullable: true })
  referenceRangeHigh: string;

  @Column({ nullable: true })
  referenceRangeText: string;

  @Column({ nullable: true })
  bodySite: string;

  @Column({ type: 'jsonb', nullable: true })
  components: Record<string, unknown>[];

  @Column({ type: 'timestamptz', nullable: true })
  effectiveDateTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
