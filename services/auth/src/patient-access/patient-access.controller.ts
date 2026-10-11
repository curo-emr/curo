import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  Roles,
  RolesGuard,
  type AuthUser,
} from '@curo/shared/auth';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PatientAccessService } from './patient-access.service';
import { PortalPasswordDto } from './portal-password.dto';

// Under /auth so the gateway's /auth prefix routes it here.
@Controller('auth/patients/:patientId/portal-access')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RECEPTIONIST')
export class PatientAccessController {
  constructor(private patientAccess: PatientAccessService) {}

  @Get()
  get(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.patientAccess.get(patientId);
  }

  @Post()
  give(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: PortalPasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patientAccess.give(patientId, dto.password, user);
  }

  @Post('reset-password')
  resetPassword(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: PortalPasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patientAccess.resetPassword(patientId, dto.password, user);
  }
}
