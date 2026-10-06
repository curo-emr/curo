import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { Patient, Observation } from '@curo/shared/database';
import { AllergyIntolerance } from '../entities/allergy-intolerance.entity';
import { Condition } from '../entities/condition.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient, AllergyIntolerance, Condition, Observation]),
  ],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
