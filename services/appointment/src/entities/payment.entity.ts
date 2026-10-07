import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PaymentStatus } from '../enums';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Index()
  @Column({ nullable: true })
  appointmentId: string;

  @Column({ nullable: true })
  encounterId: string;

  @Column({ nullable: true })
  serviceRequestId: string;

  @Column({ nullable: true })
  medicationDispenseId: string;

  @Index()
  @Column({ nullable: true })
  collectedBy: string; // receptionist practitioner id (from JWT)

  @Column({ nullable: true })
  type: string; // consultation | lab | dispensing | other

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true })
  paymentMethod: string; // cash | card | insurance

  @Column({ type: 'varchar', nullable: true })
  status: PaymentStatus;

  @Column({ nullable: true })
  receiptNumber: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
