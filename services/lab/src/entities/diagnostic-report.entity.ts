import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';
import { DiagnosticReportStatus } from '../enums';

@Entity('diagnostic_reports')
export class DiagnosticReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Index()
  @Column()
  serviceRequestId: string;

  @Column()
  performerId: string; // lab staff who entered results

  @Column({ type: 'enum', enum: DiagnosticReportStatus, default: DiagnosticReportStatus.REGISTERED })
  status: DiagnosticReportStatus;

  @Column()
  code: string; // lab test code

  @Column()
  display: string; // human-readable report title

  @Column({ type: 'jsonb', nullable: true })
  results: Record<string, unknown>[]; // list of result observations

  @Column({ nullable: true })
  conclusion: string;

  @Column({ nullable: true })
  pdfBase64: string; // base64-encoded PDF report

  @Column({ nullable: true })
  pdfPath: string;

  @Column({ type: 'timestamptz', nullable: true })
  effectiveDateTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  issued: Date;

  @Column({ type: 'jsonb', nullable: true })
  presentedForm: Record<string, unknown>[]; // FHIR attachments

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
