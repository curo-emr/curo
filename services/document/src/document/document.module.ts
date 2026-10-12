import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentReference } from '../entities/document-reference.entity';
import { AuditTrailModule } from '@curo/shared/audit';
import { STORAGE_PROVIDER } from '../storage/storage.provider';
import { MinioStorageProvider } from '../storage/minio-storage.provider';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentReference]), AuditTrailModule],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    { provide: STORAGE_PROVIDER, useClass: MinioStorageProvider },
  ],
})
export class DocumentModule {}
