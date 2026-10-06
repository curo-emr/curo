import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('clinical_notes')
export class ClinicalNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  encounterId: string;

  @Index()
  @Column()
  patientId: string;

  @Column()
  practitionerId: string;

  @Column({ type: 'text', nullable: true })
  subjective: string;

  @Column({ type: 'text', nullable: true })
  objective: string;

  @Column({ type: 'text', nullable: true })
  assessment: string;

  @Column({ type: 'text', nullable: true })
  plan: string;

  @Column({ type: 'text', nullable: true })
  additionalNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
