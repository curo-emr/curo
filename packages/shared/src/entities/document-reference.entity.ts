import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

@Entity('document_references')
export class DocumentReference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column()
  authorId: string;

  @Column({ nullable: true })
  encounterId: string;

  @Column({ nullable: true })
  relatedResourceId: string;

  @Column({ nullable: true })
  relatedResourceType: string; // ServiceRequest | DiagnosticReport | Encounter

  @Column({ nullable: true })
  status: string; // current | superseded | entered-in-error

  @Column({ nullable: true })
  docStatus: string; // preliminary | final | amended

  @Column()
  type: string; // referral-letter | lab-report | consent | discharge-summary

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  contentType: string; // application/pdf | image/jpeg

  @Column({ nullable: true })
  fileBase64: string;

  @Column({ nullable: true })
  filePath: string;

  @Column({ nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  fileName: string;

  @Column({ type: 'timestamptz', nullable: true })
  date: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
