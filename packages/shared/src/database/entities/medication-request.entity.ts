import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { MedicationRequestStatus } from '../../enums';

@Entity('medication_requests')
export class MedicationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column()
  practitionerId: string;

  // The pharmacy the prescription is sent to; only its pharmacists dispense it.
  // Null on one bought outside, and on prescriptions written before they were
  // sent to a pharmacy, which every pharmacy sees (see dispensedBy).
  @Index()
  @Column({ type: 'varchar', nullable: true })
  performerOrganizationId: string | null;

  // The patient buys it at a pharmacy of their choice: no pharmacy here
  // dispenses it, and it may be a drug the catalog doesn't list.
  @Column({ default: false })
  boughtOutside: boolean;

  @Column({ nullable: true })
  encounterId: string;

  @Column({
    type: 'enum',
    enum: MedicationRequestStatus,
    default: MedicationRequestStatus.ACTIVE,
  })
  status: MedicationRequestStatus;

  // Why the prescription is on hold, while it is (FHIR statusReason).
  @Column({ type: 'varchar', nullable: true })
  statusReason: string | null;

  @Column({ nullable: true })
  intent: string; // proposal | plan | order | original-order

  // The drug's code in the medication catalog; null for a drug bought outside
  // that the catalog doesn't list, which only has a name.
  @Column({ type: 'varchar', nullable: true })
  medicationCode: string | null;

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
