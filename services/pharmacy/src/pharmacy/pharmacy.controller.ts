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
import { PharmacyService } from './pharmacy.service';
import { DispenseMedicationDto } from './dto/dispense.dto';
import { CreateStockDto, UpdateStockDto } from './dto/stock.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  type AuthUser,
} from '@curo/shared/auth';
import type { PaginationQuery, SearchQuery } from '@curo/shared/fhir';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PharmacyController {
  constructor(private pharmacyService: PharmacyService) {}

  @Get('prescriptions/pending')
  @Roles('PHARMACIST', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  getPendingPrescriptions(@Query() query: PaginationQuery) {
    return this.pharmacyService.getPendingPrescriptions(query);
  }

  // Prescribing reference catalog (DB-backed) — searchable + paginated.
  @Get('medication-catalog')
  @Roles('DOCTOR', 'PHARMACIST', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getMedicationCatalog(@Query() query: SearchQuery) {
    return this.pharmacyService.getMedicationCatalog(query);
  }

  @Post('dispense')
  @Roles('PHARMACIST', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  dispense(@Body() dto: DispenseMedicationDto, @CurrentUser() user: AuthUser) {
    return this.pharmacyService.dispense(dto, user.userId);
  }

  @Get('dispense')
  @Roles('PHARMACIST', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Content-Type', 'application/fhir+json')
  getDispenseHistory(
    @Query('patientId') patientId?: string,
    @Query('prescriptionId') prescriptionId?: string,
    @Query() query?: PaginationQuery,
  ) {
    return this.pharmacyService.getDispenseHistory(
      { patientId, prescriptionId },
      query,
    );
  }

  @Get('dispense/:id')
  @Roles('PHARMACIST', 'SUPER_ADMIN')
  @Header('Content-Type', 'application/fhir+json')
  getDispense(@Param('id') id: string) {
    return this.pharmacyService.getDispense(id);
  }

  @Get('stock')
  @Roles('PHARMACIST', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Content-Type', 'application/fhir+json')
  getStock(
    @Query('lowOnly') lowOnly?: string,
    @Query('organizationId') organizationId?: string,
    @Query() query?: PaginationQuery,
  ) {
    return this.pharmacyService.getStock(
      lowOnly === 'true',
      organizationId,
      query,
    );
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
