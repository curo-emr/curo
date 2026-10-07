import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { User } from '../entities/user.entity';
import { Practitioner } from '../entities/practitioner.entity';
import { Patient } from '@curo/shared/database';
import { AuditTrailModule } from '../audit/audit-trail';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    AuthModule, // provides JwtModule + JwtStrategy used by the guards
    AuditTrailModule,
    OrganizationModule,
    TypeOrmModule.forFeature([User, Practitioner, Patient]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
