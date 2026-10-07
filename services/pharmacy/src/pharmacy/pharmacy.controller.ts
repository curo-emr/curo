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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  PharmacyService,
  type DispenseHistoryFilter,
} from './pharmacy.service';
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

  // Prescribing reference catalog (DB-backed) — searchable + paginated.
  @Get('medication-catalog')
  @Roles('DOCTOR', 'PHARMACIST', 'SUPER_ADMIN', 'PATIENT')
  @Header('Content-Type', 'application/fhir+json')
  getMedicationCatalog(@Query() query: SearchQuery) {
    return this.pharmacyService.getMedicationCatalog(query);
  }

  // Dispensing and receiving stock happen at a pharmacy, so only its
  // pharmacists do them; the super admin has no pharmacy.
  @Post('dispense')
  @Roles('PHARMACIST')
  @Header('Content-Type', 'application/fhir+json')
  dispense(@Body() dto: DispenseMedicationDto, @CurrentUser() user: AuthUser) {
    return this.pharmacyService.dispense(dto, user);
  }

  @Get('dispense')
  @Roles('PHARMACIST', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Content-Type', 'application/fhir+json')
  getDispenseHistory(@Query() query: DispenseHistoryFilter & PaginationQuery) {
    const { patientId, prescriptionId, search, searchPatientIds } = query;
    return this.pharmacyService.getDispenseHistory(
      { patientId, prescriptionId, search, searchPatientIds },
      query,
    );
  }

  @Get('dispense/summary')
  @Roles('PHARMACIST', 'SUPER_ADMIN')
  getDispenseSummary() {
    return this.pharmacyService.getDispenseSummary();
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
    @CurrentUser() user: AuthUser,
    @Query('organizationId') organizationId?: string,
    @Query() query?: PaginationQuery,
  ) {
    return this.pharmacyService.getStock(user, organizationId, query);
  }

  // Stock grouped by drug, with batches (different expiry dates) listed FEFO-first.
  @Get('stock/grouped')
  @Roles('PHARMACIST', 'SUPER_ADMIN', 'DOCTOR')
  getGroupedStock(
    @CurrentUser() user: AuthUser,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.pharmacyService.getGroupedStock(user, organizationId);
  }

  @Post('stock')
  @Roles('PHARMACIST')
  addStock(@Body() dto: CreateStockDto, @CurrentUser() user: AuthUser) {
    return this.pharmacyService.addStock(dto, user);
  }

  @Put('stock/:id')
  @Roles('PHARMACIST')
  updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pharmacyService.updateStock(id, dto, user);
  }

  // The drugs at or below their reorder level, one entry per drug.
  @Get('stock/alerts')
  @Roles('PHARMACIST', 'SUPER_ADMIN')
  getLowStockAlerts(
    @CurrentUser() user: AuthUser,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.pharmacyService.getLowStockAlerts(user, organizationId);
  }
}
