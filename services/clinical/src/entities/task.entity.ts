import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TaskStatus } from '../enums';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  ownerId: string; // doctor/practitioner who owns the task

  @Column({ nullable: true })
  patientId: string;

  @Column({ nullable: true })
  encounterId: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.REQUESTED })
  status: TaskStatus;

  @Column()
  description: string;

  @Column({ nullable: true })
  priority: string; // routine | urgent | asap | stat

  @Column({ nullable: true })
  code: string; // task type code

  @Column({ nullable: true })
  focus: string; // reference to relevant resource

  @Column({ nullable: true })
  note: string;

  @Column({ type: 'timestamptz', nullable: true })
  authoredOn: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastModified: Date;

  @Column({ type: 'timestamptz', nullable: true })
  restriction: Date; // deadline

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
