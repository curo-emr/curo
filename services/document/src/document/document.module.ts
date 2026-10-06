import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentReference } from '../entities/document-reference.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { STORAGE_PROVIDER } from '../storage/storage.provider';
import { MinioStorageProvider } from '../storage/minio-storage.provider';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'curo_jwt_secret_dev_2024_change_in_prod' }),
    TypeOrmModule.forFeature([DocumentReference, AuditLog]),
  ],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    JwtAuthGuard,
    RolesGuard,
    { provide: STORAGE_PROVIDER, useClass: MinioStorageProvider },
  ],
})
export class DocumentModule {}
