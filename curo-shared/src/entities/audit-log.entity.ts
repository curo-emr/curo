import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string; // who performed the action

  @Column({ nullable: true })
  userRole: string;

  @Column()
  action: string; // READ | CREATE | UPDATE | DELETE

  @Column()
  resourceType: string; // Patient | Encounter | MedicationRequest | etc.

  @Column()
  resourceId: string;

  @Column({ nullable: true })
  patientId: string; // patient whose data was accessed (if applicable)

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, unknown>; // before/after for UPDATE

  @Column({ nullable: true })
  outcome: string; // success | failure

  @Column({ nullable: true })
  outcomeDescription: string;

  @CreateDateColumn()
  createdAt: Date;
}
