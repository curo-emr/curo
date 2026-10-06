import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { DocumentReference } from '../entities/document-reference.entity';
import { AuditLog } from '@curo/shared/database';
import { STORAGE_PROVIDER } from '../storage/storage.provider';
import type { StorageProvider } from '../storage/storage.provider';
import { CreateDocumentDto } from './dto/create-document.dto';

const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const STAFF_ROLES = ['DOCTOR', 'LAB_STAFF', 'SUPER_ADMIN'];

interface AuthUser {
  userId: string;
  role: string;
  practitionerId: string | null;
  patientId: string | null;
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(DocumentReference)
    private docRepo: Repository<DocumentReference>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {}

  async upload(
    file: Express.Multer.File,
    dto: CreateDocumentDto,
    user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_CONTENT_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('File exceeds the 20 MB limit');
    }

    const objectKey = `${dto.patientId}/${randomUUID()}-${this.sanitize(file.originalname)}`;
    await this.storage.put(objectKey, file.buffer, file.mimetype);

    const doc = this.docRepo.create({
      patientId: dto.patientId,
      authorId: user.practitionerId ?? user.userId,
      encounterId: dto.encounterId,
      relatedResourceId: dto.relatedResourceId,
      relatedResourceType: dto.relatedResourceType,
      status: 'current',
      docStatus: dto.docStatus ?? 'final',
      type: dto.type,
      description: dto.description,
      contentType: file.mimetype,
      filePath: objectKey,
      fileSize: file.size,
      fileName: file.originalname,
      date: new Date(),
    });
    const saved = await this.docRepo.save(doc);
    await this.audit(user, 'CREATE', saved, {
      fileName: saved.fileName,
      type: saved.type,
    });
    return this.toFhir(saved);
  }

  async listForStaff(patientId?: string, encounterId?: string) {
    const where: Record<string, string> = {};
    if (patientId) where.patientId = patientId;
    if (encounterId) where.encounterId = encounterId;
    const docs = await this.docRepo.find({ where, order: { date: 'DESC' } });
    return docs.map((d) => this.toFhir(d));
  }

  async listForPatient(patientId: string | null) {
    if (!patientId)
      throw new ForbiddenException('No patient identity on token');
    const docs = await this.docRepo.find({
      where: { patientId },
      order: { date: 'DESC' },
    });
    return docs.map((d) => this.toFhir(d));
  }

  /** Resolve a document the caller is allowed to read and open its byte stream. */
  async openContent(
    id: string,
    user: AuthUser,
  ): Promise<{ doc: DocumentReference; stream: Readable }> {
    const doc = await this.docRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    const isStaff = STAFF_ROLES.includes(user.role);
    const isOwner = user.role === 'PATIENT' && doc.patientId === user.patientId;
    if (!isStaff && !isOwner) {
      throw new ForbiddenException('Not allowed to access this document');
    }

    const stream = await this.storage.getStream(doc.filePath);
    await this.audit(user, 'READ', doc);
    return { doc, stream };
  }

  private sanitize(name: string): string {
    return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  }

  private async audit(
    user: AuthUser,
    action: 'CREATE' | 'READ',
    doc: DocumentReference,
    changes?: Record<string, unknown>,
  ) {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          userId: user.userId,
          userRole: user.role,
          action,
          resourceType: 'DocumentReference',
          resourceId: doc.id,
          patientId: doc.patientId,
          changes: changes ? { after: changes } : undefined,
          outcome: 'SUCCESS',
        }),
      );
    } catch (err) {
      // Audit is best-effort; never block the primary operation.
      this.logger.warn(`Audit write failed: ${(err as Error).message}`);
    }
  }

  private toFhir(doc: DocumentReference) {
    return {
      resourceType: 'DocumentReference',
      id: doc.id,
      status: doc.status,
      docStatus: doc.docStatus,
      type: doc.type,
      description: doc.description,
      subject: { reference: `Patient/${doc.patientId}` },
      author: [{ reference: `Practitioner/${doc.authorId}` }],
      date: doc.date,
      context: {
        encounter: doc.encounterId
          ? [{ reference: `Encounter/${doc.encounterId}` }]
          : undefined,
        related:
          doc.relatedResourceId && doc.relatedResourceType
            ? [
                {
                  reference: `${doc.relatedResourceType}/${doc.relatedResourceId}`,
                },
              ]
            : undefined,
      },
      content: [
        {
          attachment: {
            contentType: doc.contentType,
            url: `/documents/${doc.id}/content`,
            title: doc.fileName,
            size: doc.fileSize,
            creation: doc.date,
          },
        },
      ],
    };
  }
}
