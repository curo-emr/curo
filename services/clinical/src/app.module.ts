import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalModule } from './clinical/clinical.module';
import { Encounter } from './entities/encounter.entity';
import { ClinicalNote } from './entities/clinical-note.entity';
import {
  Condition,
  MedicationRequest,
  ServiceRequest,
  Observation,
  QrCode,
  databaseOptions,
} from '@curo/shared/database';
import { Task } from './entities/task.entity';
import { Icd10Code } from './entities/icd10-code.entity';
import { JwtAuthModule } from '@curo/shared/auth';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtAuthModule,
    TypeOrmModule.forRoot(
      databaseOptions([
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
    ),
    ClinicalModule,
  ],
})
export class AppModule {}
