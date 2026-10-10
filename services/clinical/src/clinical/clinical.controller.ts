import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Header,
} from '@nestjs/common';
import { ClinicalService } from './clinical.service';
import { VisitService } from './visit.service';
import { CompleteVisitDto } from './dto/complete-visit.dto';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  actorId,
  type AuthUser,
} from '@curo/shared/auth';
import { PatientIdsQueryDto } from '@curo/shared/dto';
import type { SearchQuery } from '@curo/shared/fhir';
import { EncounterStatus } from '../enums';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClinicalController {
  constructor(
    private clinicalService: ClinicalService,
    private visitService: VisitService,
  ) {}

  // ICD-10 diagnosis catalog (DB-backed) — searchable + paginated.
  @Get('icd10')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  getIcd10(@Query() query: SearchQuery) {
    return this.clinicalService.getIcd10(query);
  }

  // Encounters
  @Post('encounters')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  createEncounter(
    @Body() dto: CreateEncounterDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinicalService.createEncounter(dto, actorId(user));
  }

  // A whole signed visit in one transaction; replaying the same id is a no-op.
  @Post('encounters/visit')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  completeVisit(@Body() dto: CompleteVisitDto, @CurrentUser() user: AuthUser) {
    return this.visitService.complete(dto, user);
  }

  @Get('encounters')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getEncounters(@Query('patientId') patientId?: string) {
    return this.clinicalService.getEncounters(patientId);
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
  updateEncounterStatus(
    @Param('id') id: string,
    @Body('status') status: EncounterStatus,
  ) {
    return this.clinicalService.updateEncounterStatus(id, status);
  }

  // Clinical Notes
  @Post('notes')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  createNote(@Body() dto: CreateNoteDto, @CurrentUser() user: AuthUser) {
    return this.clinicalService.createNote(dto, actorId(user));
  }

  @Get('notes')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  getNotes(@Query('encounterId') encounterId: string) {
    return this.clinicalService.getEncounterNotes(encounterId);
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
  @Roles('DOCTOR', 'NURSE', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  addVitals(@Body() dto: CreateVitalsDto, @CurrentUser() user: AuthUser) {
    return this.clinicalService.addVitals(dto, actorId(user), user.role);
  }

  // ?patientId= (history) or ?appointmentId= (one visit's triage vitals)
  @Get('vitals')
  @Roles('DOCTOR', 'NURSE', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getVitalsByQuery(
    @Query('patientId') patientId?: string,
    @Query('appointmentId') appointmentId?: string,
  ) {
    return this.clinicalService.getVitals({ patientId, appointmentId });
  }

  @Get('vitals/patient/:patientId')
  @Roles('DOCTOR', 'NURSE', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getVitals(@Param('patientId') patientId: string) {
    return this.clinicalService.getVitals({ patientId });
  }

  @Get('vitals/patient/:patientId/trend')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  getVitalsTrend(
    @Param('patientId') patientId: string,
    @Query('code') code: string,
  ) {
    return this.clinicalService.getVitalsTrend(patientId, code);
  }

  // Multi-code, category-agnostic trend for charts (BP + glucose + cholesterol, etc.)
  @Get('vitals/patient/:patientId/trends')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getObservationsTrend(
    @Param('patientId') patientId: string,
    @Query('codes') codes: string,
  ) {
    return this.clinicalService.getObservationsTrend(
      patientId,
      (codes || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
    );
  }

  // Prescriptions
  @Post('prescriptions')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  createPrescription(
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinicalService.createPrescription(dto, actorId(user));
  }

  @Get('prescriptions')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT', 'PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  getPrescriptions(@Query('patientId') patientId?: string) {
    return this.clinicalService.getPrescriptions(patientId);
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
  getPendingPrescriptions(@CurrentUser() user: AuthUser) {
    return this.clinicalService.getPendingPrescriptions(user);
  }

  // Pending count and latest prescription for each patient on a list page.
  @Get('prescriptions/summary')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PHARMACIST')
  getPrescriptionSummaries(@Query() query: PatientIdsQueryDto) {
    return this.clinicalService.getPrescriptionSummaries(query.patientIds);
  }

  // Declared after the literal prescriptions/* routes so ":id" doesn't capture them.
  @Get('prescriptions/:id')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  getPrescription(@Param('id') id: string) {
    return this.clinicalService.getPrescription(id);
  }

  // Lab Orders
  @Post('lab-orders')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  createLabOrder(
    @Body() dto: CreateLabOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinicalService.createLabOrder(dto, actorId(user));
  }

  // Lab staff read orders from the lab service, which limits them to their lab's.
  @Get('lab-orders')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getLabOrders(@Query('patientId') patientId?: string) {
    return this.clinicalService.getLabOrders(patientId);
  }

  @Get('lab-orders/:id')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getLabOrder(@Param('id') id: string) {
    return this.clinicalService.getLabOrder(id);
  }

  // The patient's slip for the visit's lab tests: its QR leads each lab to its own.
  @Get('encounters/:id/lab-slip')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  getLabSlip(@Param('id') id: string) {
    return this.clinicalService.getLabSlip(id);
  }

  // Tasks
  @Post('tasks')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  createTask(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser) {
    return this.clinicalService.createTask(dto, actorId(user));
  }

  @Get('tasks')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  getTasks(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    return this.clinicalService.getTasks(actorId(user), status);
  }

  @Get('tasks/mine')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  getDoctorTasks(@CurrentUser() user: AuthUser) {
    return this.clinicalService.getDoctorTasks(actorId(user));
  }

  @Put('tasks/:id')
  @Roles('DOCTOR', 'SUPER_ADMIN')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.clinicalService.updateTask(id, dto);
  }
}
