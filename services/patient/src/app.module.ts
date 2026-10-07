import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientModule } from './patient/patient.module';
import {
  Patient,
  Condition,
  Observation,
  databaseOptions,
} from '@curo/shared/database';
import { AllergyIntolerance } from './entities/allergy-intolerance.entity';
import { JwtAuthModule } from '@curo/shared/auth';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtAuthModule,
    TypeOrmModule.forRoot(
      databaseOptions([Patient, AllergyIntolerance, Condition, Observation]),
    ),
    PatientModule,
  ],
})
export class AppModule {}
