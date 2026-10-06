import {
  Controller, Post, Get, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  createStaff(
    @Body() dto: CreateStaffDto,
    @CurrentUser() user: any,
  ) {
    return this.authService.createStaff(dto, user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.userId);
  }

  @Get('practitioners')
  @UseGuards(JwtAuthGuard)
  getPractitioners(@Query('role') role?: string) {
    return this.authService.getPractitioners(role);
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'auth' };
  }
}
