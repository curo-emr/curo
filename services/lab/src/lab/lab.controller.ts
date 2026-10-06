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
import { LabService } from './lab.service';
import { EnterResultsDto } from './dto/enter-results.dto';
import { ScanQrDto } from './dto/scan-qr.dto';
import { CreateInstrumentDto } from './dto/create-instrument.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  type AuthUser,
} from '@curo/shared/auth';
import type { PaginationQuery } from '@curo/shared/fhir';
import { InstrumentStatus } from '../enums';
import { QCStatus } from '../entities/qc-log.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LabController {
  constructor(private labService: LabService) {}

  @Get('orders')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Content-Type', 'application/fhir+json')
  getOrders(
    @Query('status') status?: string,
    @Query() query?: PaginationQuery,
  ) {
    return this.labService.getOrders(status, query);
  }

  // Test catalog a lab offers — doctors browse before ordering.
  @Get('catalog')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  getCatalog(@Query('organizationId') organizationId?: string) {
    return this.labService.getCatalog(organizationId);
  }

  @Get('orders/tat')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR')
  getTatStats() {
    return this.labService.getTatStats();
  }

  @Get('orders/:id')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getOrder(@Param('id') id: string) {
    return this.labService.getOrder(id);
  }

  @Post('orders/scan')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  scanQr(@Body() dto: ScanQrDto, @CurrentUser() user: AuthUser) {
    return this.labService.scanQr(dto, user.userId);
  }

  @Put('orders/:id/receive')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  receiveOrder(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.labService.receiveOrder(id, user.userId);
  }

  @Post('results')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  enterResults(@Body() dto: EnterResultsDto, @CurrentUser() user: AuthUser) {
    return this.labService.enterResults(dto, user.userId);
  }

  @Get('reports')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getReports(
    @Query('patientId') patientId?: string,
    @Query() query?: PaginationQuery,
  ) {
    return this.labService.getReports(patientId, query);
  }

  @Get('reports/:id')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getReport(@Param('id') id: string) {
    return this.labService.getReport(id);
  }

  @Get('instruments')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR')
  getInstruments() {
    return this.labService.getInstruments();
  }

  @Get('qc-logs')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Content-Type', 'application/fhir+json')
  getQcLogs(
    @Query('instrumentId') instrumentId?: string,
    @Query('status') status?: QCStatus,
    @Query() query?: PaginationQuery,
  ) {
    return this.labService.getQcLogs({ instrumentId, status }, query);
  }

  @Get('lab-staff')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR')
  getLabStaff() {
    return this.labService.getLabStaff();
  }

  @Post('instruments')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  createInstrument(@Body() dto: CreateInstrumentDto) {
    return this.labService.createInstrument(dto);
  }

  @Put('instruments/:id/status')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  updateInstrumentStatus(
    @Param('id') id: string,
    @Body('status') status: InstrumentStatus,
    @Body('notes') notes?: string,
  ) {
    return this.labService.updateInstrumentStatus(id, status, notes);
  }
}
