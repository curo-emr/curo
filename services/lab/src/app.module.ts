import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabModule } from './lab/lab.module';
import {
  ServiceRequest,
  Observation,
  Notification,
  Patient,
  QrCode,
  databaseOptions,
} from '@curo/shared/database';
import { DiagnosticReport } from './entities/diagnostic-report.entity';
import { LabInstrument } from './entities/lab-instrument.entity';
import { LabTestCatalog } from './entities/lab-test-catalog.entity';
import { QCLog } from './entities/qc-log.entity';
import { JwtAuthModule } from '@curo/shared/auth';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtAuthModule,
    TypeOrmModule.forRoot(
      databaseOptions([
        ServiceRequest,
        DiagnosticReport,
        Observation,
        Notification,
        Patient,
        QrCode,
        LabInstrument,
        LabTestCatalog,
        QCLog,
      ]),
    ),
    LabModule,
  ],
})
export class AppModule {}
