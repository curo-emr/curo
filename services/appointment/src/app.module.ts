import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentModule } from './appointment/appointment.module';
import { PaymentModule } from './payment/payment.module';
import { Appointment } from './entities/appointment.entity';
import { Payment } from './entities/payment.entity';
import { AuditLog, databaseOptions } from '@curo/shared/database';
import { JwtAuthModule } from '@curo/shared/auth';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtAuthModule,
    TypeOrmModule.forRoot(databaseOptions([Appointment, Payment, AuditLog])),
    AppointmentModule,
    PaymentModule,
  ],
})
export class AppModule {}
