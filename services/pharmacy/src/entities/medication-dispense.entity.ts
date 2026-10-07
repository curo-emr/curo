import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { MedicationDispenseStatus } from '../enums';

@Entity('medication_dispenses')
export class MedicationDispense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  medicationRequestId: string;

  @Index()
  @Column()
  patientId: string;

  @Column()
  pharmacistId: string; // practitioner dispensing

  // The pharmacy it was dispensed at, from whose stock. Empty for an early
  // dispense whose pharmacy could not be worked out.
  @Index()
  @Column({ nullable: true })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: MedicationDispenseStatus,
    default: MedicationDispenseStatus.IN_PROGRESS,
  })
  status: MedicationDispenseStatus;

  @Column()
  medicationCode: string;

  @Column()
  medicationDisplay: string;

  @Column({ nullable: true })
  quantityValue: number;

  @Column({ nullable: true })
  quantityUnit: string;

  @Column({ nullable: true })
  daysSupply: number;

  @Column({ nullable: true })
  dosageText: string;

  @Column({ nullable: true })
  dispenserName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalPrice: number;

  @Column({ nullable: true })
  receiptNumber: string;

  // Batch number(s) the stock was drawn from (FEFO). Comma-separated if split.
  @Column({ nullable: true })
  batchNumber: string;

  @Column({ nullable: true })
  note: string;

  @Column({ type: 'timestamptz', nullable: true })
  whenHandedOver: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
