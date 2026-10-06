import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentModule } from './document/document.module';
import { DocumentReference } from './entities/document-reference.entity';
import { AuditLog } from './entities/audit-log.entity';

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
      entities: [DocumentReference, AuditLog],
      synchronize: true,
    }),
    DocumentModule,
  ],
})
export class AppModule {}
