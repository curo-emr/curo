import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import {
  JwtAuthGuard,
  Roles,
  CurrentUser,
  RolesGuard,
  type AuthUser,
} from '@curo/shared/auth';
import type { PaginationQuery } from '@curo/shared/fhir';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Post()
  log(@Body() dto: CreateAuditLogDto, @CurrentUser() user: AuthUser) {
    return this.auditService.log({
      ...dto,
      userId: user.userId,
      userRole: user.role,
    });
  }

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
