import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';
import { Encounter } from '../entities/encounter.entity';
import { ClinicalNote } from '../entities/clinical-note.entity';
import { MedicationRequest } from '../entities/medication-request.entity';
import { ServiceRequest } from '../entities/service-request.entity';
import { Observation } from '../entities/observation.entity';
import { QrCode } from '../entities/qr-code.entity';
import { Task } from '../entities/task.entity';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'curo_jwt_secret_dev_2024_change_in_prod' }),
    TypeOrmModule.forFeature([Encounter, ClinicalNote, MedicationRequest, ServiceRequest, Observation, QrCode, Task]),
  ],
  controllers: [ClinicalController],
  providers: [ClinicalService, JwtAuthGuard, RolesGuard],
})
export class ClinicalModule {}
