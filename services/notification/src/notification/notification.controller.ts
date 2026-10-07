import { Controller, Get, Put, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard, CurrentUser, type AuthUser } from '@curo/shared/auth';
import type { PaginationQuery } from '@curo/shared/fhir';

/**
 * A user's own inbox. There is no route to create a notification: the services
 * raise them as events happen (see notifyPractitioner in @curo/shared).
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  getForUser(
    @CurrentUser() user: AuthUser,
    @Query('unreadOnly') unreadOnly?: string,
    @Query() query?: PaginationQuery,
  ) {
    return this.notificationService.getForUser(
      user.userId,
      unreadOnly === 'true',
      query,
    );
  }

  @Get('count')
  // An object, as every portal reads it: a bare number goes out as text/html.
  async getUnreadCount(@CurrentUser() user: AuthUser) {
    return {
      count: await this.notificationService.getUnreadCount(user.userId),
    };
  }

  @Put(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.notificationService.markRead(id, user.userId);
  }

  @Put('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationService.markAllRead(user.userId);
  }
}
