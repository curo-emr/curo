import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** A value a test reports, with its adult reference range (per sex where they differ). */
export interface CatalogAnalyte {
  code: string; // LOINC
  display: string;
  unit: string;
  low?: number;
  high?: number;
  male?: { low: number; high: number };
  female?: { low: number; high: number };
}

@Entity('lab_test_catalog')
export class LabTestCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Which lab offers this test (doctors browse a specific lab's available tests).
  @Index()
  @Column({ nullable: true })
  organizationId: string;

  @Column()
  code: string; // LOINC

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  specimen: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  // What the test reports, e.g. a full blood count's haemoglobin, white cells and platelets.
  @Column({ type: 'jsonb', nullable: true })
  analytes: CatalogAnalyte[] | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
