import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AuditTrailModule } from '../audit/audit-trail';
import { Organization } from '../entities/organization.entity';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

@Module({
  imports: [
    AuthModule, // provides JwtModule + JwtStrategy used by the guards
    AuditTrailModule,
    TypeOrmModule.forFeature([Organization]),
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
