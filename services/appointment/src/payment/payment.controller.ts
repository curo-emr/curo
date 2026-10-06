import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
} from '@curo/shared/auth';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  // Receptionist records a visit amount (immutable once submitted).
  @Post()
  @Roles('RECEPTIONIST', 'SUPER_ADMIN')
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.paymentService.create(dto, user);
  }

  // A receptionist's own income — collectedBy is taken from the JWT, never the client.
  @Get('mine')
  @Roles('RECEPTIONIST', 'SUPER_ADMIN')
  findMine(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query() query?: any,
  ) {
    return this.paymentService.findMine(user, from, to, query);
  }

  @Get('summary')
  @Roles('RECEPTIONIST', 'SUPER_ADMIN')
  summary(
    @CurrentUser() user: any,
    @Query('period') period: 'day' | 'week' | 'month' = 'day',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.paymentService.summary(user, period, from, to);
  }

  // Admin oversight across all receptionists.
  @Get()
  @Roles('SUPER_ADMIN')
  findAll(
    @Query('collectedBy') collectedBy?: string,
    @Query('patientId') patientId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query() query?: any,
  ) {
    return this.paymentService.findAllForAdmin(
      { collectedBy, patientId, from, to },
      query,
    );
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'RECEPTIONIST')
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(id);
  }

  // Only SUPER_ADMIN can correct a payment; receptionists have no edit route.
  @Put(':id')
  @Roles('SUPER_ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.paymentService.adminUpdate(id, dto, user);
  }
}
