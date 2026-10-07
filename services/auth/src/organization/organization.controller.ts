import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  Roles,
  RolesGuard,
  type AuthUser,
} from '@curo/shared/auth';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationType } from '../entities/organization.entity';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';
import { OrganizationService } from './organization.service';

// Any signed-in user can read the directory (doctors pick a pharmacy or lab);
// only the super admin creates and changes organizations.
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}

  @Get()
  list(
    @Query('type') type?: OrganizationType,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.orgService.list({
      type,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgService.get(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: AuthUser) {
    return this.orgService.create(dto, user);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orgService.update(id, dto, user);
  }
}
