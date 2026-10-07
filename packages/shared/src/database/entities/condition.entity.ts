import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ConditionClinicalStatus } from '../../enums';

@Entity('conditions')
export class Condition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column({ nullable: true })
  encounterId: string;

  @Column()
  practitionerId: string;

  @Column({
    type: 'enum',
    enum: ConditionClinicalStatus,
    default: ConditionClinicalStatus.ACTIVE,
  })
  clinicalStatus: ConditionClinicalStatus;

  @Column({ nullable: true })
  verificationStatus: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  severity: string;

  @Column()
  code: string;

  @Column()
  display: string;

  @Column({ nullable: true })
  bodySite: string;

  @Column({ type: 'date', nullable: true })
  onsetDate: string;

  @Column({ type: 'date', nullable: true })
  abatementDate: string;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
