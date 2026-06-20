import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { User } from '../entities/user.entity';
import { Practitioner } from '../entities/practitioner.entity';
import { Patient } from '../entities/patient.entity';
import { AuditLog } from '../entities/audit-log.entity';

@Module({
  imports: [
    AuthModule, // provides JwtModule + JwtStrategy used by the guards
    TypeOrmModule.forFeature([User, Practitioner, Patient, AuditLog]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
