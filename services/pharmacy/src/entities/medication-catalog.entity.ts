import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * The one list of drugs (name/form/strength/ATC). Doctors prescribe from it,
 * and pharmacies receive `Stock` batches under its ids, so a prescription's
 * code is the code its stock is kept under.
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
