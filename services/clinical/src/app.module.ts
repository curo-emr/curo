import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalModule } from './clinical/clinical.module';
import { Encounter } from './entities/encounter.entity';
import { ClinicalNote } from './entities/clinical-note.entity';
import { MedicationRequest } from './entities/medication-request.entity';
import { ServiceRequest } from './entities/service-request.entity';
import { Observation } from './entities/observation.entity';
import { QrCode } from './entities/qr-code.entity';
import { Task } from './entities/task.entity';
import { Icd10Code } from './entities/icd10-code.entity';

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
      entities: [Encounter, ClinicalNote, MedicationRequest, ServiceRequest, Observation, QrCode, Task, Icd10Code],
      synchronize: true,
    }),
    ClinicalModule,
  ],
})
export class AppModule {}
