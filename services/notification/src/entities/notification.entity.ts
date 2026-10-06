import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';
import { NotificationEventType } from '../enums';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  recipientId: string; // userId

  @Column({ nullable: true })
  recipientRole: string;

  @Column({ type: 'enum', enum: NotificationEventType, default: NotificationEventType.GENERAL })
  eventType: NotificationEventType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ nullable: true })
  relatedResourceId: string;

  @Column({ nullable: true })
  relatedResourceType: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
