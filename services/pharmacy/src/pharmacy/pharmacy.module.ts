import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
import { MedicationRequest } from '@curo/shared/database';
import { MedicationDispense } from '../entities/medication-dispense.entity';
import { Stock } from '../entities/stock.entity';
import { MedicationCatalog } from '../entities/medication-catalog.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MedicationRequest,
      MedicationDispense,
      Stock,
      MedicationCatalog,
    ]),
  ],
  controllers: [PharmacyController],
  providers: [PharmacyService],
})
export class PharmacyModule {}
