import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { OrganizationModule } from './organization/organization.module';
import { User } from './entities/user.entity';
import { Practitioner } from './entities/practitioner.entity';
import { Patient, AuditLog, databaseOptions } from '@curo/shared/database';
import { Organization } from './entities/organization.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(
      databaseOptions([User, Practitioner, Patient, AuditLog, Organization]),
    ),
    AuthModule,
    AdminModule,
    OrganizationModule,
  ],
})
export class AppModule {}
