import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { Patient } from '../entities/patient.entity';
import { AllergyIntolerance } from '../entities/allergy-intolerance.entity';
import { Condition } from '../entities/condition.entity';
import { Observation } from '../entities/observation.entity';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'curo_jwt_secret_dev_2024_change_in_prod',
    }),
    TypeOrmModule.forFeature([Patient, AllergyIntolerance, Condition, Observation]),
  ],
  controllers: [PatientController],
  providers: [PatientService, JwtAuthGuard, RolesGuard],
})
export class PatientModule {}
