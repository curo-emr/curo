import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditTrailModule } from '@curo/shared/audit';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';
import { VisitService } from './visit.service';
import { Encounter } from '../entities/encounter.entity';
import { ClinicalNote } from '../entities/clinical-note.entity';
import {
  Condition,
  MedicationRequest,
  ServiceRequest,
  Observation,
  QrCode,
} from '@curo/shared/database';
import { Task } from '../entities/task.entity';
import { Icd10Code } from '../entities/icd10-code.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Encounter,
      ClinicalNote,
      MedicationRequest,
      ServiceRequest,
      Observation,
      QrCode,
      Task,
      Icd10Code,
      Condition,
    ]),
    AuditTrailModule,
  ],
  controllers: [ClinicalController],
  providers: [ClinicalService, VisitService],
})
export class ClinicalModule {}
