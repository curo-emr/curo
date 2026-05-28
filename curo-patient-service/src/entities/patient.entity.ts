import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';
import { Gender, MaritalStatus } from '../enums';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  patientCode: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  middleName: string;

  @Column({ type: 'date' })
  birthDate: string;

  @Column({ type: 'enum', enum: Gender, default: Gender.UNKNOWN })
  gender: Gender;

  @Column({ nullable: true })
  nic: string;

  @Column({ nullable: true })
  passportNumber: string;

  @Column({ nullable: true, type: 'enum', enum: MaritalStatus })
  maritalStatus: MaritalStatus;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  addressLine1: string;

  @Column({ nullable: true })
  addressLine2: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  bloodType: string;

  @Column({ nullable: true })
  emergencyContactName: string;

  @Column({ nullable: true })
  emergencyContactPhone: string;

  @Column({ nullable: true })
  emergencyContactRelationship: string;

  @Column({ nullable: true })
  insuranceProvider: string;

  @Column({ nullable: true })
  insurancePolicyNumber: string;

  @Column({ nullable: true })
  insuranceGroupNumber: string;

  @Column({ nullable: true })
  photo: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  fhirExtensions: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
