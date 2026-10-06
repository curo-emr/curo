import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles, CurrentUser } from '../common/decorators';
import { RolesGuard } from '../common/roles.guard';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Post()
  log(@Body() dto: any) {
    return this.auditService.log(dto);
  }

  @Get()
  @Roles('SUPER_ADMIN')
  findAll(
    @CurrentUser() user: any,
    @Query('userId') userId?: string,
    @Query('resourceType') resourceType?: string,
    @Query('patientId') patientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query() query?: any,
  ) {
    return this.auditService.findAll(user, { userId, resourceType, patientId, from, to }, query);
  }
}
