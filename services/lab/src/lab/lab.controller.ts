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
import { LabService, type OrderFilter } from './lab.service';
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
    @CurrentUser() user: AuthUser,
    @Query() query: OrderFilter & PaginationQuery,
  ) {
    return this.labService.getOrders(user, query, query);
  }

  @Get('orders/summary')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR')
  getOrderSummary(
    @CurrentUser() user: AuthUser,
    @Query('encounterId') encounterId?: string,
  ) {
    return this.labService.getOrderSummary(user, { encounterId });
  }

  // Test catalog a lab offers — doctors browse before ordering.
  @Get('catalog')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  getCatalog(@Query('organizationId') organizationId?: string) {
    return this.labService.getCatalog(organizationId);
  }

  @Get('orders/tat')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR')
  getTatStats(@CurrentUser() user: AuthUser) {
    return this.labService.getTatStats(user);
  }

  @Get('orders/:id')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getOrder(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.labService.getOrder(id, user);
  }

  // A sample label receives the sample (a ServiceRequest comes back); a visit
  // slip finds the visit's tests for the scanner's lab (a searchset Bundle).
  @Post('orders/scan')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  scanQr(@Body() dto: ScanQrDto, @CurrentUser() user: AuthUser) {
    return this.labService.scanQr(dto, user);
  }

  @Put('orders/:id/receive')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  receiveOrder(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.labService.receiveOrder(id, user);
  }

  @Post('results')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  enterResults(@Body() dto: EnterResultsDto, @CurrentUser() user: AuthUser) {
    return this.labService.enterResults(dto, user);
  }

  @Get('reports')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getReports(
    @CurrentUser() user: AuthUser,
    @Query('patientId') patientId?: string,
    @Query('encounterId') encounterId?: string,
    @Query('serviceRequestId') serviceRequestId?: string,
    @Query() query?: PaginationQuery,
  ) {
    return this.labService.getReports(
      user,
      { patientId, encounterId, serviceRequestId },
      query,
    );
  }

  @Get('reports/:id')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getReport(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.labService.getReport(id, user);
  }

  @Get('instruments')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR')
  getInstruments(@CurrentUser() user: AuthUser) {
    return this.labService.getInstruments(user);
  }

  @Get('qc-logs')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Content-Type', 'application/fhir+json')
  getQcLogs(
    @CurrentUser() user: AuthUser,
    @Query('instrumentId') instrumentId?: string,
    @Query('status') status?: QCStatus,
    @Query() query?: PaginationQuery,
  ) {
    return this.labService.getQcLogs(user, { instrumentId, status }, query);
  }

  @Get('lab-staff')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR')
  getLabStaff(@CurrentUser() user: AuthUser) {
    return this.labService.getLabStaff(user);
  }

  @Post('instruments')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  createInstrument(
    @Body() dto: CreateInstrumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.labService.createInstrument(dto, user);
  }

  @Put('instruments/:id/status')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  updateInstrumentStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body('status') status: InstrumentStatus,
    @Body('notes') notes?: string,
  ) {
    return this.labService.updateInstrumentStatus(id, user, status, notes);
  }
}
