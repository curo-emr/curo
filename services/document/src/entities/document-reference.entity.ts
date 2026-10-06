import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

/**
 * FHIR-flavoured DocumentReference, owned by curo-document-service. Only
 * metadata lives here; the binary bytes live in object storage (MinIO) keyed
 * by `filePath` (object key).
 */
@Entity('document_references')
export class DocumentReference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column()
  authorId: string;

  @Index()
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
  contentType: string; // application/pdf | image/jpeg | image/png

  @Column({ nullable: true })
  fileBase64: string; // unused: bytes live in object storage, not the DB

  @Column({ nullable: true })
  filePath: string; // object storage key (bucket-relative)

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
