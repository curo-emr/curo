import { Controller, Get, Query, Injectable, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
  ) {}

  list(type?: string): Promise<Organization[]> {
    const where: any = { active: true };
    if (type) where.type = type;
    return this.orgRepo.find({ where, order: { name: 'ASC' } });
  }
}

// Any authenticated user can read the directory (doctors pick a pharmacy/lab).
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}

  @Get()
  list(@Query('type') type?: string) {
    return this.orgService.list(type);
  }
}

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Organization])],
  controllers: [OrganizationController],
  providers: [OrganizationService],
})
export class OrganizationModule {}
