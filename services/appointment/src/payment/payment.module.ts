import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from '../entities/payment.entity';
import { Appointment } from '../entities/appointment.entity';
import { AuditTrailModule } from '@curo/shared/audit';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Appointment]), AuditTrailModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
