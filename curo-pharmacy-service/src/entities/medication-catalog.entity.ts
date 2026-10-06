import {
  Entity, PrimaryColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

/**
 * Prescribing reference catalog (drug name/form/strength/ATC) — distinct from
 * per-batch `Stock` inventory. Doctors browse this when writing prescriptions.
 */
@Entity('medication_catalog')
export class MedicationCatalog {
  // Keep the catalog ids (e.g. med_0101) so commonSubstitutes references resolve.
  @PrimaryColumn()
  id: string;

  @Index()
  @Column()
  name: string;

  @Column({ nullable: true })
  genericName: string;

  @Column({ nullable: true })
  form: string;

  @Column({ nullable: true })
  strength: string;

  @Column({ nullable: true })
  atc: string;

  @Column({ type: 'jsonb', nullable: true })
  commonSubstitutes: string[];

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
