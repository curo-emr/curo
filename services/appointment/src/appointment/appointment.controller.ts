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
import {
  AppointmentService,
  type AppointmentFilters,
} from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateQueueStageDto } from './dto/update-queue-stage.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  type AuthUser,
} from '@curo/shared/auth';
import type { PaginationQuery } from '@curo/shared/fhir';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentController {
  constructor(private appointmentService: AppointmentService) {}

  @Post()
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Content-Type', 'application/fhir+json')
  create(@Body() dto: CreateAppointmentDto) {
    return this.appointmentService.create(dto);
  }

  @Get()
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT', 'NURSE')
  @Header('Content-Type', 'application/fhir+json')
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: AppointmentFilters & PaginationQuery,
  ) {
    const { date, from, to, practitionerId, patientId, status, queueStage } =
      query;
    return this.appointmentService.findAll(
      user,
      {
        date,
        from,
        to,
        practitionerId,
        patientId,
        status,
        queueStage,
        _sort: query._sort,
      },
      query,
    );
  }

  @Get('schedule/:practitionerId')
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR')
  getDoctorSchedule(
    @Param('practitionerId') practitionerId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentService.getDoctorSchedule(
      practitionerId,
      date || new Date().toISOString().split('T')[0],
    );
  }

  @Get('patient/:patientId')
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getPatientAppointments(@Param('patientId') patientId: string) {
    return this.appointmentService.getPatientAppointments(patientId);
  }

  @Get(':id')
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT', 'NURSE')
  @Header('Content-Type', 'application/fhir+json')
  findOne(@Param('id') id: string) {
    return this.appointmentService.findOne(id);
  }

  @Put(':id')
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Content-Type', 'application/fhir+json')
  update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentService.update(id, dto);
  }

  // Moves a checked-in patient through the day's flow (nurse triage → doctor).
  // Transition + per-stage role rules live in queue-stage.ts.
  @Put(':id/queue-stage')
  @Roles('NURSE', 'RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  updateQueueStage(
    @Param('id') id: string,
    @Body() dto: UpdateQueueStageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointmentService.updateQueueStage(id, dto.stage, user);
  }
}
