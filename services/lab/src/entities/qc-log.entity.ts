import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

export enum QCStatus {
  PASS = 'pass',
  FAIL = 'fail',
  WARNING = 'warning',
}

@Entity('lab_qc_logs')
export class QCLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  instrumentId: string;

  @Column()
  testCode: string;

  @Column()
  controlLevel: string;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  expectedValue: number;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  observedValue: number;

  @Column({ nullable: true })
  unit: string;

  @Index()
  @Column({ type: 'enum', enum: QCStatus, default: QCStatus.PASS })
  status: QCStatus;

  @Column()
  performedBy: string;

  @Index()
  @Column({ type: 'timestamptz' })
  performedAt: Date;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
