import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationEventType } from '../enums';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepo: Repository<Notification>,
  ) {}

  async create(data: {
    recipientId: string;
    recipientRole?: string;
    eventType: NotificationEventType;
    title: string;
    message: string;
    relatedResourceId?: string;
    relatedResourceType?: string;
  }): Promise<Notification> {
    const notification = this.notificationsRepo.create(data);
    return this.notificationsRepo.save(notification);
  }

  async getForUser(userId: string, unreadOnly = false): Promise<Notification[]> {
    const query = this.notificationsRepo
      .createQueryBuilder('n')
      .where('n.recipientId = :userId', { userId });
    if (unreadOnly) query.andWhere('n.isRead = false');
    return query.orderBy('n.createdAt', 'DESC').limit(50).getMany();
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.notificationsRepo.update(
      { id, recipientId: userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationsRepo.update(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepo.count({ where: { recipientId: userId, isRead: false } });
  }
}
