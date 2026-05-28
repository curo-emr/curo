import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, Header,
} from '@nestjs/common';
import { LabService } from './lab.service';
import { EnterResultsDto } from './dto/enter-results.dto';
import { ScanQrDto } from './dto/scan-qr.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles, CurrentUser } from '../common/decorators';
import { InstrumentStatus } from '../enums';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LabController {
  constructor(private labService: LabService) {}

  @Get('orders')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Content-Type', 'application/fhir+json')
  getOrders(@Query('status') status?: string) {
    return this.labService.getOrders(status);
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
  scanQr(@Body() dto: ScanQrDto, @CurrentUser() user: any) {
    return this.labService.scanQr(dto, user.userId);
  }

  @Put('orders/:id/receive')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  receiveOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.labService.receiveOrder(id, user.userId);
  }

  @Post('results')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  enterResults(@Body() dto: EnterResultsDto, @CurrentUser() user: any) {
    return this.labService.enterResults(dto, user.userId);
  }

  @Get('reports')
  @Roles('LAB_STAFF', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getReports(@Query('patientId') patientId?: string) {
    return this.labService.getReports(patientId);
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

  @Post('instruments')
  @Roles('LAB_STAFF', 'SUPER_ADMIN')
  createInstrument(@Body() dto: any) {
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
