import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RolesGuard,
  Roles,
  CurrentUser,
  type AuthUser,
} from '@curo/shared/auth';
import type { PaginationQuery } from '@curo/shared/fhir';

// All routes are SUPER_ADMIN only. Mounted under /auth/users so the existing
// gateway /auth prefix routes them to this service (no gateway change needed).
@Controller('auth/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post()
  createUser(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.adminService.createUser(dto, user);
  }

  @Get()
  listUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query() query?: PaginationQuery,
  ) {
    return this.adminService.listUsers({ search, role }, query);
  }

  @Get(':id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateUser(id, dto, user);
  }

  @Post(':id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.resetPassword(id, dto.newPassword, user);
  }
}
