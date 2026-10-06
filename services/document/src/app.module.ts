import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentModule } from './document/document.module';
import { DocumentReference } from './entities/document-reference.entity';
import { AuditLog, databaseOptions } from '@curo/shared/database';
import { JwtAuthModule } from '@curo/shared/auth';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtAuthModule,
    TypeOrmModule.forRoot(databaseOptions([DocumentReference, AuditLog])),
    DocumentModule,
  ],
})
export class AppModule {}
