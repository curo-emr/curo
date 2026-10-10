import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '@curo/shared/auth';
import { parseList } from '@curo/shared/fhir';
import { ScheduleService } from './schedule.service';
import { SetSessionsDto } from './dto/set-sessions.dto';

// Doctors' weekly sessions: when each sees patients, and in which room.
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleController {
  constructor(private scheduleService: ScheduleService) {}

  /** `practitionerId` is an optional comma-separated list; without it, every doctor. */
  @Get()
  @Roles('RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR', 'NURSE')
  list(@Query('practitionerId') practitionerId?: string) {
    return this.scheduleService.list(parseList(practitionerId));
  }

  @Put(':practitionerId')
  @Roles('SUPER_ADMIN')
  replace(
    @Param('practitionerId') practitionerId: string,
    @Body() dto: SetSessionsDto,
  ) {
    return this.scheduleService.replace(practitionerId, dto.sessions);
  }
}
