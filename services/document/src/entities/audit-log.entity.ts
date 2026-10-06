import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column({ nullable: true })
  userRole: string;

  @Column()
  action: string; // CREATE | UPDATE | DELETE | READ

  @Column()
  resourceType: string;

  @Column()
  resourceId: string;

  @Column({ nullable: true })
  patientId: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, unknown>;

  @Column({ nullable: true })
  outcome: string;

  @Column({ nullable: true })
  outcomeDescription: string;

  @CreateDateColumn()
  createdAt: Date;
}
