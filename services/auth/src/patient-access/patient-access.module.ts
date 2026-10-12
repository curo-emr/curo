import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '@curo/shared/database';
import { AuthModule } from '../auth/auth.module';
import { AuditTrailModule } from '@curo/shared/audit';
import { User } from '../entities/user.entity';
import { PatientAccessController } from './patient-access.controller';
import { PatientAccessService } from './patient-access.service';

@Module({
  imports: [
    AuthModule, // JwtStrategy for the guard, and Passwords
    AuditTrailModule,
    TypeOrmModule.forFeature([User, Patient]),
  ],
  controllers: [PatientAccessController],
  providers: [PatientAccessService],
})
export class PatientAccessModule {}
