import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
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

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.BOOKED })
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
