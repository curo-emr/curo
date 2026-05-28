import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';
import { MedicationRequestStatus } from '../enums';

@Entity('medication_requests')
export class MedicationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column()
  practitionerId: string;

  @Column({ nullable: true })
  encounterId: string;

  @Column({ type: 'enum', enum: MedicationRequestStatus, default: MedicationRequestStatus.ACTIVE })
  status: MedicationRequestStatus;

  @Column({ nullable: true })
  intent: string; // proposal | plan | order | original-order

  @Column()
  medicationCode: string; // medication code/name

  @Column()
  medicationDisplay: string; // human-readable medication name

  @Column({ nullable: true })
  dosageText: string;

  @Column({ nullable: true })
  route: string; // oral | IV | topical | etc.

  @Column({ nullable: true })
  frequency: string; // once daily | twice daily | etc.

  @Column({ nullable: true })
  durationDays: number;

  @Column({ nullable: true })
  quantityValue: number;

  @Column({ nullable: true })
  quantityUnit: string;

  @Column({ nullable: true })
  refillsAllowed: number;

  @Column({ nullable: true })
  substitutionAllowed: boolean;

  @Column({ nullable: true })
  reasonCode: string;

  @Column({ nullable: true })
  note: string;

  @Column({ type: 'timestamptz', nullable: true })
  authoredOn: Date;

  @Column({ nullable: true })
  dispensedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
