import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { UserRole } from '@curo/shared/enums';
import {
  auditOf,
  registerPatient,
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
    doctor = await svc.as(UserRole.DOCTOR);
  });

  afterAll(() => svc.close());

  /** A patient on file, with no sign-in; returns their id. */
  const newPatient = () => registerPatient(svc.db);

  /** A patient's sign-in, for a patient of their own on file. */
  async function patientActor(): Promise<TestActor> {
    const patient = await svc.as(UserRole.PATIENT);
    await registerPatient(svc.db, patient.patientId!);
    return patient;
  }

  /** A technician working at `labId`. */
  const technicianAt = (labId: string) =>
    svc.as(UserRole.LAB_STAFF, { organizationId: labId });

  /** Uploads a file for `patientId`: a lab report unless `fields` say otherwise. */
  const upload = (
    patientId: string,
    actor = doctor,
    fields: Record<string, string> = {},
    file = { body: PDF, name: 'cbc-report.pdf', type: 'application/pdf' },
  ) => {
    const req = svc.api
      .post('/documents')
      .set(actor.headers)
      .field('patientId', patientId);
    for (const [name, value] of Object.entries({
      type: 'lab-report',
      ...fields,
    }))
      void req.field(name, value);
    return req.attach('file', file.body, {
      filename: file.name,
      contentType: file.type,
    });
  };

  /** Uploads a PDF for `patientId` and returns the new document's id. */
  async function uploaded(
    patientId: string,
    actor = doctor,
    fields: Record<string, string> = {},
  ): Promise<string> {
    const res = await upload(patientId, actor, fields).expect(201);
    return (res.body as { id: string }).id;
  }

  /** A lab order sent to `labId`, as the clinical service keeps them. */
  async function labOrder(labId: string, patientId?: string) {
    patientId ??= await newPatient();
    const encounterId = randomUUID();
    const [{ id }] = await svc.db.query<{ id: string }[]>(
      `INSERT INTO service_requests
         ("patientId", "requesterId", "encounterId", "performerOrganizationId", code, display)
       VALUES ($1, $2, $3, $4, '58410-2', 'Full blood count')
       RETURNING id`,
      [patientId, randomUUID(), encounterId, labId],
    );
    return { id, patientId, encounterId };
  }

  /** The fields that link an upload to a lab order. */
  const forOrder = (orderId: string) => ({
    relatedResourceType: 'ServiceRequest',
    relatedResourceId: orderId,
  });

  /** A report file `labId`'s technician uploaded for `order`; returns its id. */
  const reportFor = async (
    labId: string,
    order: { id: string; patientId: string },
  ) => uploaded(order.patientId, await technicianAt(labId), forOrder(order.id));

  const list = (query: Record<string, string>, actor: TestActor) =>
    svc.api.get('/documents').query(query).set(actor.headers);

  const ids = (res: { body: unknown }) =>
    (res.body as { id: string }[]).map((d) => d.id);

  const documentsOf = (patientId: string) =>
    svc.db.getRepository(DocumentReference).findBy({ patientId });

  describe('POST /documents', () => {
    it('stores the file under the patient and records who added it', async () => {
      const patientId = await newPatient();

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
      await expect(auditOf(svc, doc.id)).resolves.toEqual([
        expect.objectContaining({ action: 'CREATE', userId: doctor.sub }),
      ]);
    });

    it('refuses file types other than PDF, JPEG and PNG, storing nothing', async () => {
      const patientId = await newPatient();
      const stored = storage.objects.size;

      await upload(
        patientId,
        doctor,
        {},
        {
          body: Buffer.from('#!/bin/sh'),
          name: 'run.sh',
          type: 'text/x-shellscript',
        },
      ).expect(400);

      expect(storage.objects.size).toBe(stored);
      await expect(documentsOf(patientId)).resolves.toEqual([]);
    });

    it("refuses a file whose contents aren't the type it was sent as", async () => {
      const patientId = await newPatient();
      const stored = storage.objects.size;
      const program = Buffer.from('MZ\x90\x00 not really a program');
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      for (const [body, type] of [
        [program, 'application/pdf'],
        [png, 'application/pdf'],
        [PDF, 'image/png'],
        [Buffer.alloc(0), 'image/jpeg'],
      ] as const)
        await upload(
          patientId,
          doctor,
          {},
          { body, name: 'scan', type },
        ).expect(400);

      expect(storage.objects.size).toBe(stored);
      await expect(documentsOf(patientId)).resolves.toEqual([]);
    });

    it('refuses a patient who is not on file, storing nothing', async () => {
      const patientId = randomUUID();
      const stored = storage.objects.size;

      await upload(patientId).expect(400);

      expect(storage.objects.size).toBe(stored);
      await expect(documentsOf(patientId)).resolves.toEqual([]);
    });

    it('is refused to patients, nurses and pharmacists', async () => {
      const patientId = await newPatient();

      for (const actor of [
        await patientActor(),
        await svc.as(UserRole.NURSE),
        await svc.as(UserRole.PHARMACIST),
      ])
        await upload(patientId, actor).expect(403);

      await expect(documentsOf(patientId)).resolves.toEqual([]);
    });
  });

  describe('GET /documents/:id/content', () => {
    it('lets the patient download their own document, and audits the read', async () => {
      const patient = await patientActor();
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
      await expect(auditOf(svc, id)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: 'READ', userId: patient.sub }),
        ]),
      );
    });

    it("hides another patient's document, without auditing a read", async () => {
      const id = await uploaded(await newPatient());

      await svc.api
        .get(`/documents/${id}/content`)
        .set((await patientActor()).headers)
        .expect(404);

      const actions = (await auditOf(svc, id)).map((a) => a.action);
      expect(actions).toEqual(['CREATE']);
    });

    it('lets doctors and the admin open any document', async () => {
      const id = await uploaded(await newPatient());

      for (const role of [UserRole.DOCTOR, UserRole.SUPER_ADMIN])
        await svc.api
          .get(`/documents/${id}/content`)
          .set((await svc.as(role)).headers)
          .expect(200);
    });
  });

  describe('GET /documents', () => {
    it("lists a patient's documents, newest first", async () => {
      const patientId = await newPatient();
      const first = await uploaded(patientId);
      const second = await uploaded(patientId, doctor, { type: 'consent' });
      await uploaded(await newPatient());

      const res = await list({ patientId }, doctor).expect(200);

      expect(ids(res)).toEqual([second, first]);
    });

    it('needs a patient, visit or lab order to list by', async () => {
      await list({}, doctor).expect(400);
    });
  });

  describe('Lab staff', () => {
    const lab = randomUUID();
    const otherLab = randomUUID();
    let technician: TestActor;

    beforeAll(async () => {
      technician = await technicianAt(lab);
    });

    it("upload report files for their lab's orders, onto the order's visit", async () => {
      const order = await labOrder(lab);

      const id = await uploaded(
        order.patientId,
        technician,
        forOrder(order.id),
      );

      const doc = await svc.db
        .getRepository(DocumentReference)
        .findOneByOrFail({ id });
      expect(doc).toMatchObject({
        patientId: order.patientId,
        encounterId: order.encounterId,
        authorId: technician.practitionerId,
        relatedResourceId: order.id,
      });
    });

    it("can't upload anything but a report file for their own lab's order", async () => {
      const order = await labOrder(lab);
      const stored = storage.objects.size;

      // Another lab's order, as if it didn't exist.
      const elsewhere = await labOrder(otherLab);
      await upload(
        elsewhere.patientId,
        technician,
        forOrder(elsewhere.id),
      ).expect(404);
      // Not linked to an order, not a lab report, or onto another patient.
      await upload(order.patientId, technician).expect(400);
      await upload(order.patientId, technician, {
        ...forOrder(order.id),
        type: 'referral-letter',
      }).expect(400);
      await upload(await newPatient(), technician, forOrder(order.id)).expect(
        400,
      );

      expect(storage.objects.size).toBe(stored);
      await expect(documentsOf(order.patientId)).resolves.toEqual([]);
      await expect(documentsOf(elsewhere.patientId)).resolves.toEqual([]);
    });

    it("see and open only their lab's report files", async () => {
      const patientId = await newPatient();
      const ours = await labOrder(lab, patientId);
      const theirs = await labOrder(otherLab, patientId);
      const ourReport = await reportFor(lab, ours);
      const theirReport = await reportFor(otherLab, theirs);
      const letter = await uploaded(patientId, doctor, {
        type: 'referral-letter',
      });

      expect(ids(await list({ patientId }, technician).expect(200))).toEqual([
        ourReport,
      ]);
      expect(
        ids(await list({ serviceRequestId: ours.id }, technician).expect(200)),
      ).toEqual([ourReport]);
      expect(
        ids(
          await list({ serviceRequestId: theirs.id }, technician).expect(200),
        ),
      ).toEqual([]);

      const open = (id: string) =>
        svc.api.get(`/documents/${id}/content`).set(technician.headers);
      await open(ourReport).expect(200);
      await open(theirReport).expect(404);
      await open(letter).expect(404);
    });

    it('need to be assigned a lab', async () => {
      await list(
        { patientId: randomUUID() },
        await svc.as(UserRole.LAB_STAFF),
      ).expect(403);
    });
  });

  describe('GET /documents/me', () => {
    it("lists only the signed-in patient's documents", async () => {
      const patient = await patientActor();
      const mine = await uploaded(patient.patientId!);
      await uploaded(await newPatient());

      const res = await svc.api
        .get('/documents/me')
        .set(patient.headers)
        .expect(200);

      expect((res.body as { id: string }[]).map((d) => d.id)).toEqual([mine]);
    });
  });
});
