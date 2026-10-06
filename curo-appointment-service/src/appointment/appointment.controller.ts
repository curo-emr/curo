import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, Header,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles, CurrentUser } from '../common/decorators';

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
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  findAll(
    @CurrentUser() user: any,
    @Query('date') date?: string,
    @Query('practitionerId') practitionerId?: string,
    @Query('patientId') patientId?: string,
    @Query() query?: any,
  ) {
    return this.appointmentService.findAll(user, { date, practitionerId, patientId }, query);
  }

  @Get('schedule/:practitionerId')
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR')
  getDoctorSchedule(
    @Param('practitionerId') practitionerId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentService.getDoctorSchedule(practitionerId, date || new Date().toISOString().split('T')[0]);
  }

  @Get('patient/:patientId')
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getPatientAppointments(@Param('patientId') patientId: string) {
    return this.appointmentService.getPatientAppointments(patientId);
  }

  @Get(':id')
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
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
}
