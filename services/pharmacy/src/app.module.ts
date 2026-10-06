import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { MedicationRequest } from './entities/medication-request.entity';
import { MedicationDispense } from './entities/medication-dispense.entity';
import { Stock } from './entities/stock.entity';
import { MedicationCatalog } from './entities/medication-catalog.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'curo',
      password: process.env.DB_PASS || 'curo_secret',
      database: process.env.DB_NAME || 'curo_db',
      entities: [MedicationRequest, MedicationDispense, Stock, MedicationCatalog],
      synchronize: true,
    }),
    PharmacyModule,
  ],
})
export class AppModule {}
