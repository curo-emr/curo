import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

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

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
