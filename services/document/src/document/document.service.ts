import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { DocumentReference } from '../entities/document-reference.entity';
import { AuditTrail } from '@curo/shared/audit';
import { STORAGE_PROVIDER } from '../storage/storage.provider';
import type { StorageProvider } from '../storage/storage.provider';
import { CreateDocumentDto } from './dto/create-document.dto';
import { actorId, type AuthUser } from '@curo/shared/auth';
import { UserRole } from '@curo/shared/enums';
import { LAB_REPORT_DOCUMENT, labScope } from '@curo/shared/lab';
import { assertPatientOnFile } from '@curo/shared/database';
import { assertAcceptedFile } from './accepted-file';

/** What staff list documents by; at least one is required. */
export interface DocumentFilter {
  patientId?: string;
  encounterId?: string;
  serviceRequestId?: string;
}

/** The patient and visit of a lab order, which a lab's report file goes on. */
interface LabOrderRow {
  patientId: string;
  encounterId: string | null;
}

/** The audit entry's record and patient for a document. */
function auditedDocument(doc: DocumentReference) {
  return {
    resourceType: 'DocumentReference',
    resourceId: doc.id,
    patientId: doc.patientId,
  };
}

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentReference)
    private docRepo: Repository<DocumentReference>,
    private auditTrail: AuditTrail,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {}

  async upload(
    file: Express.Multer.File,
    dto: CreateDocumentDto,
    user: AuthUser,
  ) {
    assertAcceptedFile(file);
    await assertPatientOnFile(this.docRepo.manager, dto.patientId);
    const encounterId = await this.encounterOfUpload(dto, user);

    const objectKey = `${dto.patientId}/${randomUUID()}-${this.sanitize(file.originalname)}`;
    await this.storage.put(objectKey, file.buffer, file.mimetype);

    const doc = this.docRepo.create({
      patientId: dto.patientId,
      authorId: actorId(user),
      encounterId,
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
    await this.auditTrail.record(user, {
      ...auditedDocument(saved),
      action: 'CREATE',
      changes: { after: { fileName: saved.fileName, type: saved.type } },
    });
    return this.toFhir(saved);
  }

  async listForStaff(user: AuthUser, filter: DocumentFilter) {
    const { patientId, encounterId, serviceRequestId } = filter;
    if (!patientId && !encounterId && !serviceRequestId)
      throw new BadRequestException(
        'Give a patientId, encounterId or serviceRequestId',
      );

    const query = this.visibleTo(user);
    if (patientId) query.andWhere('d.patientId = :patientId', { patientId });
    if (encounterId)
      query.andWhere('d.encounterId = :encounterId', { encounterId });
    if (serviceRequestId)
      query.andWhere(
        `d.relatedResourceType = 'ServiceRequest' AND d.relatedResourceId = :serviceRequestId`,
        { serviceRequestId },
      );
    const docs = await query.orderBy('d.date', 'DESC').getMany();
    return docs.map((d) => this.toFhir(d));
  }

  async listForPatient(user: AuthUser) {
    const docs = await this.visibleTo(user).orderBy('d.date', 'DESC').getMany();
    return docs.map((d) => this.toFhir(d));
  }

  /** Resolve a document the caller is allowed to read and open its byte stream. */
  async openContent(
    id: string,
    user: AuthUser,
  ): Promise<{ doc: DocumentReference; stream: Readable }> {
    const doc = await this.visibleTo(user)
      .andWhere('d.id = :id', { id })
      .getOne();
    if (!doc) throw new NotFoundException('Document not found');

    const stream = await this.storage.getStream(doc.filePath);
    await this.auditTrail.record(user, {
      ...auditedDocument(doc),
      action: 'READ',
    });
    return { doc, stream };
  }

  /**
   * The documents `user` may see, as `d`: a patient sees their own; lab staff
   * see the report files of their lab's orders; doctors and the admin see all.
   * Any other document is as good as missing.
   */
  private visibleTo(user: AuthUser) {
    const query = this.docRepo.createQueryBuilder('d');
    if (user.role === UserRole.PATIENT) {
      if (!user.patientId)
        throw new ForbiddenException('No patient identity on token');
      return query.where('d.patientId = :patientId', {
        patientId: user.patientId,
      });
    }
    const lab = labScope(user);
    if (lab)
      // service_requests is owned by the clinical service, so it is read with raw SQL.
      query.where(
        `d.type = :labReport AND d.relatedResourceType = 'ServiceRequest'
         AND d.relatedResourceId IN (
           SELECT id::text FROM service_requests WHERE "performerOrganizationId" = :lab
         )`,
        { labReport: LAB_REPORT_DOCUMENT, lab },
      );
    return query;
  }

  /**
   * The visit an upload goes on. Lab staff upload only report files for their
   * lab's orders, and those go on the order's patient and visit.
   */
  private async encounterOfUpload(
    dto: CreateDocumentDto,
    user: AuthUser,
  ): Promise<string | undefined> {
    const lab = labScope(user);
    if (!lab) return dto.encounterId;

    if (
      dto.type !== LAB_REPORT_DOCUMENT ||
      dto.relatedResourceType !== 'ServiceRequest' ||
      !dto.relatedResourceId
    )
      throw new BadRequestException(
        `Lab staff upload ${LAB_REPORT_DOCUMENT} files for a lab order (relatedResourceType ServiceRequest)`,
      );
    const [order] = await this.docRepo.manager.query<LabOrderRow[]>(
      `SELECT "patientId", "encounterId" FROM service_requests
       WHERE id::text = $1 AND "performerOrganizationId" = $2`,
      [dto.relatedResourceId, lab],
    );
    if (!order)
      throw new NotFoundException(
        `Lab order ${dto.relatedResourceId} not found`,
      );
    if (order.patientId !== dto.patientId)
      throw new BadRequestException('That lab order is for another patient');
    return order.encounterId ?? undefined;
  }

  private sanitize(name: string): string {
    return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
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
