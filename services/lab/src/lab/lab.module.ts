import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabController } from './lab.controller';
import { LabService } from './lab.service';
import { ServiceRequest, Observation, QrCode } from '@curo/shared/database';
import { DiagnosticReport } from '../entities/diagnostic-report.entity';
import { LabInstrument } from '../entities/lab-instrument.entity';
import { LabTestCatalog } from '../entities/lab-test-catalog.entity';
import { QCLog } from '../entities/qc-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceRequest, DiagnosticReport, Observation, QrCode, LabInstrument, LabTestCatalog, QCLog]),
  ],
  controllers: [LabController],
  providers: [LabService],
})
export class LabModule {}
