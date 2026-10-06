import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard, CurrentUser } from '@curo/shared/auth';
import { NotificationEventType } from '../enums';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Post()
  create(
    @Body()
    dto: {
      recipientId: string;
      recipientRole?: string;
      eventType: NotificationEventType;
      title: string;
      message: string;
      relatedResourceId?: string;
      relatedResourceType?: string;
    },
  ) {
    return this.notificationService.create(dto);
  }

  @Get()
  getForUser(
    @CurrentUser() user: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query() query?: any,
  ) {
    return this.notificationService.getForUser(
      user.userId,
      unreadOnly === 'true',
      query,
    );
  }

  @Get('count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationService.getUnreadCount(user.userId);
  }

  @Put(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationService.markRead(id, user.userId);
  }

  @Put('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.notificationService.markAllRead(user.userId);
  }
}
