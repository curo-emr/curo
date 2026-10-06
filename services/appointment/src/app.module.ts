import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentModule } from './appointment/appointment.module';
import { PaymentModule } from './payment/payment.module';
import { Appointment } from './entities/appointment.entity';
import { Payment } from './entities/payment.entity';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'curo',
      password: process.env.DB_PASS || 'curo_secret',
      database: process.env.DB_NAME || 'curo_db',
      entities: [Appointment, Payment, AuditLog],
      synchronize: true,
    }),
    AppointmentModule,
    PaymentModule,
  ],
})
export class AppModule {}
