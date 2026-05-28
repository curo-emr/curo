import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification } from '../entities/notification.entity';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'curo_jwt_secret_dev_2024_change_in_prod' }),
    TypeOrmModule.forFeature([Notification]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, JwtAuthGuard],
  exports: [NotificationService],
})
export class NotificationModule {}
