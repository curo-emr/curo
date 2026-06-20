import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, Header,
} from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { DispenseMedicationDto } from './dto/dispense.dto';
import { CreateStockDto, UpdateStockDto } from './dto/stock.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles, CurrentUser } from '../common/decorators';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PharmacyController {
  constructor(private pharmacyService: PharmacyService) {}

  @Get('prescriptions/pending')
  @Roles('PHARMACIST', 'SUPER_ADMIN')
  getPendingPrescriptions() {
    return this.pharmacyService.getPendingPrescriptions();
  }

  @Post('dispense')
  @Roles('PHARMACIST', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  dispense(@Body() dto: DispenseMedicationDto, @CurrentUser() user: any) {
    return this.pharmacyService.dispense(dto, user.userId);
  }

  @Get('dispense')
  @Roles('PHARMACIST', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Content-Type', 'application/fhir+json')
  getDispenseHistory(@Query('patientId') patientId?: string) {
    return this.pharmacyService.getDispenseHistory(patientId);
  }

  @Get('dispense/:id')
  @Roles('PHARMACIST', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  getDispense(@Param('id') id: string) {
    return this.pharmacyService.getDispense(id);
  }

  @Get('stock')
  @Roles('PHARMACIST', 'SUPER_ADMIN', 'DOCTOR')
  getStock(@Query('lowOnly') lowOnly?: string, @Query('organizationId') organizationId?: string) {
    return this.pharmacyService.getStock(lowOnly === 'true', organizationId);
  }

  // Stock grouped by drug, with batches (different expiry dates) listed FEFO-first.
  @Get('stock/grouped')
  @Roles('PHARMACIST', 'SUPER_ADMIN', 'DOCTOR')
  getGroupedStock() {
    return this.pharmacyService.getGroupedStock();
  }

  @Post('stock')
  @Roles('PHARMACIST', 'SUPER_ADMIN')
  addStock(@Body() dto: CreateStockDto) {
    return this.pharmacyService.addStock(dto);
  }

  @Put('stock/:id')
  @Roles('PHARMACIST', 'SUPER_ADMIN')
  updateStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.pharmacyService.updateStock(id, dto);
  }

  @Get('stock/alerts')
  @Roles('PHARMACIST', 'SUPER_ADMIN')
  getLowStockAlerts() {
    return this.pharmacyService.getLowStockAlerts();
  }
}
