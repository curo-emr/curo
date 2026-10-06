import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentReference } from '../entities/document-reference.entity';
import { AuditLog } from '@curo/shared/database';
import { STORAGE_PROVIDER } from '../storage/storage.provider';
import { MinioStorageProvider } from '../storage/minio-storage.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentReference, AuditLog]),
  ],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    { provide: STORAGE_PROVIDER, useClass: MinioStorageProvider },
  ],
})
export class DocumentModule {}
