import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  AllergyIntoleranceCriticality,
  AllergyIntoleranceType,
} from '../enums';

@Entity('allergy_intolerances')
export class AllergyIntolerance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column()
  practitionerId: string;

  @Column({
    type: 'enum',
    enum: AllergyIntoleranceType,
    default: AllergyIntoleranceType.ALLERGY,
  })
  type: AllergyIntoleranceType;

  @Column({
    type: 'enum',
    enum: AllergyIntoleranceCriticality,
    default: AllergyIntoleranceCriticality.LOW,
  })
  criticality: AllergyIntoleranceCriticality;

  @Column()
  code: string;

  @Column()
  display: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  clinicalStatus: string;

  @Column({ nullable: true })
  verificationStatus: string;

  @Column({ type: 'jsonb', nullable: true })
  reactions: Record<string, unknown>[];

  @Column({ type: 'date', nullable: true })
  onsetDate: string;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
