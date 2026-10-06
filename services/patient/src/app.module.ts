import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientModule } from './patient/patient.module';
import { Patient } from './entities/patient.entity';
import { AllergyIntolerance } from './entities/allergy-intolerance.entity';
import { Condition } from './entities/condition.entity';
import { Observation } from './entities/observation.entity';

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
      entities: [Patient, AllergyIntolerance, Condition, Observation],
      synchronize: true,
    }),
    PatientModule,
  ],
})
export class AppModule {}
