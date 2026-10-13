import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import {
  JwtAuthGuard,
  Roles,
  CurrentUser,
  RolesGuard,
  type AuthUser,
} from '@curo/shared/auth';
import type { PaginationQuery } from '@curo/shared/fhir';

/**
 * The audit log, for the super admin to read. There is no route to write an
 * entry: each service records what its users do through AuditTrail in
 * @curo/shared/audit.
 */
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('userId') userId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('patientId') patientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query() query?: PaginationQuery,
  ) {
    return this.auditService.findAll(
      user,
      { userId, resourceType, patientId, from, to },
      query,
    );
  }
}
