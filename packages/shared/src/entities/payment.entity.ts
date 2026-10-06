import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column({ nullable: true })
  encounterId: string;

  @Column({ nullable: true })
  appointmentId: string;

  @Column({ nullable: true })
  serviceRequestId: string;

  @Column({ nullable: true })
  medicationDispenseId: string;

  @Column({ nullable: true })
  collectedBy: string; // receptionist/pharmacist practitioner id

  @Column({ nullable: true })
  type: string; // consultation | lab | dispensing | other

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true })
  paymentMethod: string; // cash | card | insurance

  @Column({ nullable: true })
  status: string; // pending | paid | refunded | waived

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
