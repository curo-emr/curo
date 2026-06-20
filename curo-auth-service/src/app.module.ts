import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { OrganizationModule } from './organization/organization.module';
import { User } from './entities/user.entity';
import { Practitioner } from './entities/practitioner.entity';
import { Patient } from './entities/patient.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Organization } from './entities/organization.entity';

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
      entities: [User, Practitioner, Patient, AuditLog, Organization],
      synchronize: true,
    }),
    AuthModule,
    AdminModule,
    OrganizationModule,
  ],
})
export class AppModule {}
