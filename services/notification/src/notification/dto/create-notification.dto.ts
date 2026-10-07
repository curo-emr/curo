import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotificationEventType } from '../../enums';

/** A notification for one user, shown in their portal's bell. */
export class CreateNotificationDto {
  /** The recipient's user (account) id. */
  @IsNotEmpty()
  @IsString()
  recipientId: string;

  @IsOptional()
  @IsString()
  recipientRole?: string;

  @IsEnum(NotificationEventType)
  eventType: NotificationEventType;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  relatedResourceId?: string;

  @IsOptional()
  @IsString()
  relatedResourceType?: string;
}
