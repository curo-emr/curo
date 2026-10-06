import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { MedicationRequest, databaseOptions } from '@curo/shared/database';
import { MedicationDispense } from './entities/medication-dispense.entity';
import { Stock } from './entities/stock.entity';
import { MedicationCatalog } from './entities/medication-catalog.entity';
import { JwtAuthModule } from '@curo/shared/auth';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtAuthModule,
    TypeOrmModule.forRoot(
      databaseOptions([
        MedicationRequest,
        MedicationDispense,
        Stock,
        MedicationCatalog,
      ]),
    ),
    PharmacyModule,
  ],
})
export class AppModule {}
