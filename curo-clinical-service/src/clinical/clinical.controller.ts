import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, Header,
} from '@nestjs/common';
import { ClinicalService } from './clinical.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles, CurrentUser } from '../common/decorators';
import { EncounterStatus } from '../enums';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicalController {
  constructor(private clinicalService: ClinicalService) {}

  // Encounters
  @Post('encounters')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  createEncounter(@Body() dto: CreateEncounterDto, @CurrentUser() user: any) {
    return this.clinicalService.createEncounter(dto, user.userId);
  }

  @Get('encounters/patient/:patientId')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getPatientEncounters(@Param('patientId') patientId: string) {
    return this.clinicalService.getPatientEncounters(patientId);
  }

  @Get('encounters/:id')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getEncounter(@Param('id') id: string) {
    return this.clinicalService.getEncounter(id);
  }

  @Put('encounters/:id/status')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  updateEncounterStatus(@Param('id') id: string, @Body('status') status: EncounterStatus) {
    return this.clinicalService.updateEncounterStatus(id, status);
  }

  // Clinical Notes
  @Post('notes')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  createNote(@Body() dto: CreateNoteDto, @CurrentUser() user: any) {
    return this.clinicalService.createNote(dto, user.userId);
  }

  @Get('notes/encounter/:encounterId')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  getEncounterNotes(@Param('encounterId') encounterId: string) {
    return this.clinicalService.getEncounterNotes(encounterId);
  }

  @Get('notes/patient/:patientId')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  getPatientNotes(@Param('patientId') patientId: string) {
    return this.clinicalService.getPatientNotes(patientId);
  }

  // Vitals
  @Post('vitals')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  addVitals(@Body() dto: CreateVitalsDto, @CurrentUser() user: any) {
    return this.clinicalService.addVitals(dto, user.userId);
  }

  @Get('vitals/patient/:patientId')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getVitals(@Param('patientId') patientId: string) {
    return this.clinicalService.getVitals(patientId);
  }

  @Get('vitals/patient/:patientId/trend')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  getVitalsTrend(@Param('patientId') patientId: string, @Query('code') code: string) {
    return this.clinicalService.getVitalsTrend(patientId, code);
  }

  // Prescriptions
  @Post('prescriptions')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  createPrescription(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: any) {
    return this.clinicalService.createPrescription(dto, user.userId);
  }

  @Get('prescriptions/patient/:patientId')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT', 'PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  getPatientPrescriptions(@Param('patientId') patientId: string) {
    return this.clinicalService.getPatientPrescriptions(patientId);
  }

  @Get('prescriptions/pending')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  getPendingPrescriptions() {
    return this.clinicalService.getPendingPrescriptions();
  }

  // Lab Orders
  @Post('lab-orders')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  createLabOrder(@Body() dto: CreateLabOrderDto, @CurrentUser() user: any) {
    return this.clinicalService.createLabOrder(dto, user.userId);
  }

  @Get('lab-orders')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'LAB_STAFF', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getLabOrders(@Query('patientId') patientId?: string) {
    return this.clinicalService.getLabOrders(patientId);
  }

  @Get('lab-orders/:id')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'LAB_STAFF', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getLabOrder(@Param('id') id: string) {
    return this.clinicalService.getLabOrder(id);
  }

  // Tasks
  @Post('tasks')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  createTask(@Body() dto: any, @CurrentUser() user: any) {
    return this.clinicalService.createTask(dto, user.userId);
  }

  @Get('tasks/mine')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  getDoctorTasks(@CurrentUser() user: any) {
    return this.clinicalService.getDoctorTasks(user.userId);
  }

  @Put('tasks/:id')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  updateTask(@Param('id') id: string, @Body() dto: any) {
    return this.clinicalService.updateTask(id, dto);
  }
}
