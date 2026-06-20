import {
  Controller, Get, Post, Put, Patch, Body, Param, Query,
  UseGuards, Request, Header,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { CreateConditionDto } from './dto/create-condition.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles, CurrentUser } from '../common/decorators';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientController {
  constructor(private patientService: PatientService) {}

  @Post()
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Content-Type', 'application/fhir+json')
  create(@Body() dto: CreatePatientDto) {
    return this.patientService.create(dto);
  }

  @Get()
  @Roles('DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN', 'LAB_STAFF', 'PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  findAll(@CurrentUser() user: any, @Query('search') search?: string) {
    return this.patientService.findAll(user, search);
  }

  @Get('me')
  @Roles('PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getMyRecord(@CurrentUser() user: any) {
    return this.patientService.findMyRecord(user.userId);
  }

  @Get('code/:code')
  @Roles('DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN', 'LAB_STAFF')
  @Header('Content-Type', 'application/fhir+json')
  findByCode(@Param('code') code: string) {
    return this.patientService.findByCode(code);
  }

  @Get(':id')
  @Roles('DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientService.findOne(id, user);
  }

  @Put(':id')
  @Roles('DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @CurrentUser() user: any) {
    return this.patientService.update(id, dto, user);
  }

  @Patch(':id')
  @Roles('DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  patch(@Param('id') id: string, @Body() dto: UpdatePatientDto, @CurrentUser() user: any) {
    return this.patientService.update(id, dto, user);
  }

  // Allergies
  @Get(':id/allergies')
  @Roles('DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getAllergies(@Param('id') id: string) {
    return this.patientService.getAllergies(id);
  }

  @Post(':id/allergies')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  addAllergy(@Param('id') id: string, @Body() dto: CreateAllergyDto, @CurrentUser() user: any) {
    return this.patientService.addAllergy(id, dto, user.userId);
  }

  // Conditions
  @Get(':id/conditions')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getConditions(@Param('id') id: string) {
    return this.patientService.getConditions(id);
  }

  @Post(':id/conditions')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  addCondition(@Param('id') id: string, @Body() dto: CreateConditionDto, @CurrentUser() user: any) {
    return this.patientService.addCondition(id, dto, user.userId);
  }

  // Vitals
  @Get(':id/vitals')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getVitals(@Param('id') id: string) {
    return this.patientService.getVitals(id);
  }

  @Get(':id/vitals/trend')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  getVitalsTrend(@Param('id') id: string, @Query('code') code: string) {
    return this.patientService.getVitalsTrend(id, code);
  }
}
