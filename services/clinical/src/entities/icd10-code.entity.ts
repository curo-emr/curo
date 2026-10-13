import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

/**
 * The ICD-10-CM diagnosis list doctors search when recording a diagnosis.
 * Filled from CMS's yearly release by database/import-icd10cm.ts.
 */
@Entity('icd10_codes')
export class Icd10Code {
  // Searches match words anywhere in a code or name (ILIKE '%…%'), which only
  // trigram indexes can serve. TypeORM can't declare them, so the migration
  // Icd10CodesTrigramSearch makes them and synchronize: false keeps them.
  @Index('icd10_codes_code_trgm', { synchronize: false })
  @PrimaryColumn()
  code: string;

  @Index('icd10_codes_name_trgm', { synchronize: false })
  @Column()
  name: string;
}
