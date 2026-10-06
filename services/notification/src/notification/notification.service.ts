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

  async getForUser(
    userId: string,
    unreadOnly = false,
    pagination?: {
      page?: string | number;
      pageSize?: string | number;
      _count?: string | number;
    },
  ): Promise<Notification[]> {
    const query = this.notificationsRepo
      .createQueryBuilder('n')
      .where('n.recipientId = :userId', { userId });
    if (unreadOnly) query.andWhere('n.isRead = false');

    // Configurable page size (replaces the hard-coded 50 cap); the dropdown reads
    // the recent slice, but admins can page deeper via page/pageSize/_count.
    const rawSize = pagination?.pageSize ?? pagination?._count;
    let pageSize = Number(rawSize);
    if (!Number.isFinite(pageSize) || pageSize <= 0) pageSize = 50;
    pageSize = Math.min(Math.max(Math.floor(pageSize), 1), 100);
    let page = Number(pagination?.page);
    if (!Number.isFinite(page) || page < 1) page = 1;

    return query
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();
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
    return this.notificationsRepo.count({
      where: { recipientId: userId, isRead: false },
    });
  }
}
