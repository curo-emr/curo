import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabController } from './lab.controller';
import { LabService } from './lab.service';
import { ServiceRequest } from '../entities/service-request.entity';
import { DiagnosticReport } from '../entities/diagnostic-report.entity';
import { Observation } from '../entities/observation.entity';
import { QrCode } from '../entities/qr-code.entity';
import { LabInstrument } from '../entities/lab-instrument.entity';
import { LabTestCatalog } from '../entities/lab-test-catalog.entity';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'curo_jwt_secret_dev_2024_change_in_prod' }),
    TypeOrmModule.forFeature([ServiceRequest, DiagnosticReport, Observation, QrCode, LabInstrument, LabTestCatalog]),
  ],
  controllers: [LabController],
  providers: [LabService, JwtAuthGuard, RolesGuard],
})
export class LabModule {}
