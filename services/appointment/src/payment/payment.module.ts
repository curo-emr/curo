import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from '../entities/payment.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'curo_jwt_secret_dev_2024_change_in_prod' }),
    TypeOrmModule.forFeature([Payment, AuditLog]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, JwtAuthGuard, RolesGuard],
})
export class PaymentModule {}
