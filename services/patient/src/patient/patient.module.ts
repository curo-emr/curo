import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { Patient, Condition, Observation } from '@curo/shared/database';
import { AllergyIntolerance } from '../entities/allergy-intolerance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Patient,
      AllergyIntolerance,
      Condition,
      Observation,
    ]),
  ],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
