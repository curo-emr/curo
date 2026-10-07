import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { AuditLog } from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import { DocumentReference } from '../src/entities/document-reference.entity';
import {
  STORAGE_PROVIDER,
  type StorageProvider,
} from '../src/storage/storage.provider';

/** Object storage held in memory, in place of MinIO. */
class MemoryStorage implements StorageProvider {
  readonly objects = new Map<string, Buffer>();

  put(key: string, body: Buffer) {
    this.objects.set(key, body);
    return Promise.resolve();
  }

  getStream(key: string) {
    const body = this.objects.get(key);
    if (!body) return Promise.reject(new Error(`No object ${key}`));
    return Promise.resolve(Readable.from(body));
  }

  getPresignedUrl(key: string) {
    return Promise.resolve(`memory://${key}`);
  }

  delete(key: string) {
    this.objects.delete(key);
    return Promise.resolve();
  }
}

const PDF = Buffer.from('%PDF-1.4\n% test report\n');

describe('Patient documents', () => {
  const storage = new MemoryStorage();
  let svc: ServiceUnderTest;
  let doctor: TestActor;

  beforeAll(async () => {
    svc = await startService(AppModule, [
      { provide: STORAGE_PROVIDER, useValue: storage },
    ]);
    doctor = svc.as(UserRole.DOCTOR);
  });

  afterAll(() => svc.close());

  /** A patient's sign-in, for a patient of their own. */
  const patientActor = () => svc.as(UserRole.PATIENT);

  const upload = (
    patientId: string,
    actor = doctor,
    file = { body: PDF, name: 'cbc-report.pdf', type: 'application/pdf' },
  ) =>
    svc.api
      .post('/documents')
      .set(actor.headers)
      .field('patientId', patientId)
      .field('type', 'lab-report')
      .attach('file', file.body, {
        filename: file.name,
        contentType: file.type,
      });

  /** Uploads a PDF for `patientId` and returns the new document's id. */
  async function uploaded(patientId: string): Promise<string> {
    const res = await upload(patientId).expect(201);
    return (res.body as { id: string }).id;
  }

  const auditOf = (documentId: string) =>
    svc.db.getRepository(AuditLog).findBy({ resourceId: documentId });

  const documentsOf = (patientId: string) =>
    svc.db.getRepository(DocumentReference).findBy({ patientId });

  describe('POST /documents', () => {
    it('stores the file under the patient and records who added it', async () => {
      const patientId = randomUUID();

      const res = await upload(patientId).expect(201);

      const [doc] = await documentsOf(patientId);
      expect(doc).toMatchObject({
        authorId: doctor.practitionerId,
        type: 'lab-report',
        contentType: 'application/pdf',
        fileName: 'cbc-report.pdf',
        fileSize: PDF.length,
      });
      expect(doc.filePath.startsWith(`${patientId}/`)).toBe(true);
      expect(storage.objects.get(doc.filePath)).toEqual(PDF);
      expect(res.body).toMatchObject({
        resourceType: 'DocumentReference',
        subject: { reference: `Patient/${patientId}` },
        author: [{ reference: `Practitioner/${doctor.practitionerId}` }],
      });
      await expect(auditOf(doc.id)).resolves.toEqual([
        expect.objectContaining({ action: 'CREATE', userId: doctor.sub }),
      ]);
    });

    it('refuses file types other than PDF, JPEG and PNG, storing nothing', async () => {
      const patientId = randomUUID();
      const stored = storage.objects.size;

      await upload(patientId, doctor, {
        body: Buffer.from('#!/bin/sh'),
        name: 'run.sh',
        type: 'text/x-shellscript',
      }).expect(400);

      expect(storage.objects.size).toBe(stored);
      await expect(documentsOf(patientId)).resolves.toEqual([]);
    });

    it('is refused to patients, nurses and pharmacists', async () => {
      const patientId = randomUUID();

      for (const actor of [
        patientActor(),
        svc.as(UserRole.NURSE),
        svc.as(UserRole.PHARMACIST),
      ])
        await upload(patientId, actor).expect(403);

      await expect(documentsOf(patientId)).resolves.toEqual([]);
    });
  });

  describe('GET /documents/:id/content', () => {
    it('lets the patient download their own document, and audits the read', async () => {
      const patient = patientActor();
      const id = await uploaded(patient.patientId!);

      const res = await svc.api
        .get(`/documents/${id}/content`)
        .set(patient.headers)
        .buffer(true)
        .parse((response, done) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.body).toEqual(PDF);
      await expect(auditOf(id)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: 'READ', userId: patient.sub }),
        ]),
      );
    });

    it("refuses another patient's document, without auditing a read", async () => {
      const id = await uploaded(randomUUID());

      await svc.api
        .get(`/documents/${id}/content`)
        .set(patientActor().headers)
        .expect(403);

      const actions = (await auditOf(id)).map((a) => a.action);
      expect(actions).toEqual(['CREATE']);
    });

    it('lets clinical and lab staff open any document', async () => {
      const id = await uploaded(randomUUID());

      for (const role of [
        UserRole.DOCTOR,
        UserRole.LAB_STAFF,
        UserRole.SUPER_ADMIN,
      ])
        await svc.api
          .get(`/documents/${id}/content`)
          .set(svc.as(role).headers)
          .expect(200);
    });
  });

  describe('GET /documents/me', () => {
    it("lists only the signed-in patient's documents", async () => {
      const patient = patientActor();
      const mine = await uploaded(patient.patientId!);
      await uploaded(randomUUID());

      const res = await svc.api
        .get('/documents/me')
        .set(patient.headers)
        .expect(200);

      expect((res.body as { id: string }[]).map((d) => d.id)).toEqual([mine]);
    });
  });
});
