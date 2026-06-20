import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabModule } from './lab/lab.module';
import { ServiceRequest } from './entities/service-request.entity';
import { DiagnosticReport } from './entities/diagnostic-report.entity';
import { Observation } from './entities/observation.entity';
import { QrCode } from './entities/qr-code.entity';
import { LabInstrument } from './entities/lab-instrument.entity';
import { LabTestCatalog } from './entities/lab-test-catalog.entity';

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
      entities: [ServiceRequest, DiagnosticReport, Observation, QrCode, LabInstrument, LabTestCatalog],
      synchronize: true,
    }),
    LabModule,
  ],
})
export class AppModule {}
