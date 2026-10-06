import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DiagnosticReportStatus } from '../enums';

/** One result line in a report, as entered by lab staff. */
export interface LabResultItem {
  code: string; // LOINC
  display: string;
  value?: number;
  unit?: string;
  valueString?: string;
  referenceRangeLow?: string;
  referenceRangeHigh?: string;
  referenceRangeText?: string;
  interpretation?: string; // N | H | L | HH | LL
}

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

  @Column({
    type: 'enum',
    enum: DiagnosticReportStatus,
    default: DiagnosticReportStatus.REGISTERED,
  })
  status: DiagnosticReportStatus;

  @Column()
  code: string; // lab test code

  @Column()
  display: string; // human-readable report title

  @Column({ type: 'jsonb', nullable: true })
  results: LabResultItem[] | null;

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
