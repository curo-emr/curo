import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '@curo/shared/database';
import { parsePagination, type PaginationQuery } from '@curo/shared/fhir';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepo: Repository<Notification>,
  ) {}

  async getForUser(
    userId: string,
    unreadOnly = false,
    pagination?: PaginationQuery,
  ): Promise<Notification[]> {
    const query = this.notificationsRepo
      .createQueryBuilder('n')
      .where('n.recipientId = :userId', { userId });
    if (unreadOnly) query.andWhere('n.isRead = false');

    // The dropdown reads the recent slice; callers can page deeper.
    const { skip, take } = parsePagination(pagination, 50);
    return query.orderBy('n.createdAt', 'DESC').skip(skip).take(take).getMany();
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
