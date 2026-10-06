import {
  Entity, PrimaryColumn, Column, Index,
} from 'typeorm';

/**
 * ICD-10 diagnosis code catalog. Doctors search this when recording conditions.
 * Backed by the DB (seeded) rather than a bundled frontend JSON file.
 */
@Entity('icd10_codes')
export class Icd10Code {
  @PrimaryColumn()
  code: string;

  @Index()
  @Column()
  name: string;

  @Column({ type: 'jsonb', nullable: true })
  keywords: string[];
}
