import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Header,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PatientService } from './patient.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateAllergyDto, UpdateAllergyDto } from './dto/create-allergy.dto';
import { CreateConditionDto } from './dto/create-condition.dto';
import {
  actorId,
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  readablePatient,
  type AuthUser,
} from '@curo/shared/auth';
import { PatientIdsQueryDto } from '@curo/shared/dto';
import type { PaginationQuery } from '@curo/shared/fhir';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientController {
  constructor(private patientService: PatientService) {}

  @Post()
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Content-Type', 'application/fhir+json')
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: AuthUser) {
    return this.patientService.create(dto, actorId(user));
  }

  @Get()
  @Roles(
    'DOCTOR',
    'NURSE',
    'RECEPTIONIST',
    'SUPER_ADMIN',
    'LAB_STAFF',
    'PHARMACIST',
  )
  @Header('Content-Type', 'application/fhir+json')
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
    @Query() query?: PaginationQuery,
  ) {
    return this.patientService.findAll(user, search, query);
  }

  @Get('me')
  @Roles('PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getMyRecord(@CurrentUser() user: AuthUser) {
    return this.patientService.findMyRecord(user.userId);
  }

  @Get('code/:code')
  @Roles('DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN', 'LAB_STAFF', 'PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  findByCode(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    return this.patientService.findByCode(code, user.role);
  }

  // Allergies for several patients at once (a page of a patient list).
  @Get('allergies')
  @Roles('DOCTOR', 'NURSE', 'RECEPTIONIST', 'SUPER_ADMIN', 'PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  getAllergiesForPatients(@Query() query: PatientIdsQueryDto) {
    return this.patientService.getAllergiesForPatients(query.patientIds);
  }

  // Pharmacy & lab can fetch a patient by id, but receive a minimized projection
  // (see toFhirPatient). Patients are restricted to their own record in the service.
  @Get(':id')
  @Roles(
    'DOCTOR',
    'NURSE',
    'RECEPTIONIST',
    'SUPER_ADMIN',
    'PATIENT',
    'LAB_STAFF',
    'PHARMACIST',
  )
  @Header('Content-Type', 'application/fhir+json')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.patientService.findOne(id, user);
  }

  @Put(':id')
  @Roles('DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patientService.update(id, dto, user);
  }

  @Patch(':id')
  @Roles('DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  patch(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patientService.update(id, dto, user);
  }

  // Allergies — pharmacy needs these for safe dispensing, nurses for safe triage; lab does not.
  @Get(':id/allergies')
  @Roles(
    'DOCTOR',
    'NURSE',
    'RECEPTIONIST',
    'SUPER_ADMIN',
    'PATIENT',
    'PHARMACIST',
  )
  @Header('Content-Type', 'application/fhir+json')
  getAllergies(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.patientService.getAllergies(readablePatient(user, id));
  }

  // Reception records the allergies a patient reports; only doctors change or retire them.
  @Post(':id/allergies')
  @Roles('DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  addAllergy(
    @Param('id') id: string,
    @Body() dto: CreateAllergyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patientService.addAllergy(id, dto, actorId(user));
  }

  @Patch(':id/allergies/:allergyId')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  updateAllergy(
    @Param('id') id: string,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
    @Body() dto: UpdateAllergyDto,
  ) {
    return this.patientService.updateAllergy(id, allergyId, dto);
  }

  // Conditions
  @Get(':id/conditions')
  @Roles('DOCTOR', 'NURSE', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getConditions(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.patientService.getConditions(readablePatient(user, id));
  }

  @Post(':id/conditions')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  addCondition(
    @Param('id') id: string,
    @Body() dto: CreateConditionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patientService.addCondition(id, dto, actorId(user));
  }

  // Vitals
  @Get(':id/vitals')
  @Roles('DOCTOR', 'NURSE', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getVitals(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.patientService.getVitals(readablePatient(user, id));
  }

  @Get(':id/vitals/trend')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  getVitalsTrend(@Param('id') id: string, @Query('code') code: string) {
    return this.patientService.getVitalsTrend(id, code);
  }
}
