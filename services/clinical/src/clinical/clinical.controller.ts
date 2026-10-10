import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Header,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClinicalService } from './clinical.service';
import { VisitService } from './visit.service';
import { CompleteVisitDto } from './dto/complete-visit.dto';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { HoldPrescriptionDto } from './dto/hold-prescription.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  actorId,
  patientScope,
  readablePatient,
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
  getEncounters(
    @CurrentUser() user: AuthUser,
    @Query('patientId') patientId?: string,
  ) {
    return this.clinicalService.getEncounters(readablePatient(user, patientId));
  }

  @Get('encounters/patient/:patientId')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getPatientEncounters(
    @Param('patientId') patientId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinicalService.getPatientEncounters(
      readablePatient(user, patientId),
    );
  }

  @Get('encounters/:id')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getEncounter(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.clinicalService.getEncounter(id, patientScope(user));
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
  getNotes(
    @Query('encounterId') encounterId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinicalService.getEncounterNotes(
      encounterId,
      patientScope(user),
    );
  }

  @Get('notes/encounter/:encounterId')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  getEncounterNotes(
    @Param('encounterId') encounterId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinicalService.getEncounterNotes(
      encounterId,
      patientScope(user),
    );
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
    @CurrentUser() user: AuthUser,
    @Query('patientId') patientId?: string,
    @Query('appointmentId') appointmentId?: string,
  ) {
    return this.clinicalService.getVitals({
      patientId: readablePatient(user, patientId),
      appointmentId,
    });
  }

  @Get('vitals/patient/:patientId')
  @Roles('DOCTOR', 'NURSE', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getVitals(
    @Param('patientId') patientId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinicalService.getVitals({
      patientId: readablePatient(user, patientId),
    });
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
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinicalService.getObservationsTrend(
      readablePatient(user, patientId),
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
  getPrescriptions(
    @CurrentUser() user: AuthUser,
    @Query('patientId') patientId?: string,
  ) {
    return this.clinicalService.getPrescriptions(
      readablePatient(user, patientId),
    );
  }

  @Get('prescriptions/patient/:patientId')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT', 'PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  getPatientPrescriptions(
    @Param('patientId') patientId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinicalService.getPatientPrescriptions(
      readablePatient(user, patientId),
    );
  }

  @Get('prescriptions/pending')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  getPendingPrescriptions(@CurrentUser() user: AuthUser) {
    return this.clinicalService.getPendingPrescriptions(user);
  }

  @Get('prescriptions/on-hold')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  getHeldPrescriptions(@CurrentUser() user: AuthUser) {
    return this.clinicalService.getHeldPrescriptions(user);
  }

  // A pharmacist sets a prescription aside (out of stock, a query to the
  // doctor) and releases it when it can be dispensed.
  @Put('prescriptions/:id/hold')
  @Roles('PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  holdPrescription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HoldPrescriptionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinicalService.holdPrescription(id, dto.reason, user);
  }

  @Delete('prescriptions/:id/hold')
  @Roles('PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  releasePrescription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.clinicalService.releasePrescription(id, user);
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
  getLabOrders(
    @CurrentUser() user: AuthUser,
    @Query('patientId') patientId?: string,
  ) {
    return this.clinicalService.getLabOrders(readablePatient(user, patientId));
  }

  @Get('lab-orders/:id')
  @Roles('DOCTOR', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getLabOrder(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.clinicalService.getLabOrder(id, patientScope(user));
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
