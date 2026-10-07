import { randomUUID } from 'node:crypto';
import * as QRCode from 'qrcode';
import type { EntityTarget, ObjectLiteral } from 'typeorm';
import {
  Condition,
  MedicationRequest,
  Observation,
  QrCode,
  ServiceRequest,
} from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import { parseLabQr } from '@curo/shared/lab';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import { ClinicalNote } from '../src/entities/clinical-note.entity';
import { Encounter } from '../src/entities/encounter.entity';

// The real encoder, wrapped so a test can make it fail once.
jest.mock('qrcode', () => {
  const actual = jest.requireActual<typeof QRCode>('qrcode');
  return {
    ...actual,
    toDataURL: jest.fn((text: string) => actual.toDataURL(text)),
  };
});

/** The records a signed visit writes, each found by its encounterId. */
const VISIT_RECORDS: EntityTarget<ObjectLiteral>[] = [
  Encounter,
  ClinicalNote,
  Observation,
  Condition,
  MedicationRequest,
  ServiceRequest,
];

describe('POST /encounters/visit', () => {
  let svc: ServiceUnderTest;
  let doctor: TestActor;
  let lab: string;

  /** An organization, as the auth service keeps them; returns its id. */
  async function organization(type: string, active = true) {
    const id = randomUUID();
    await svc.db.query(
      `INSERT INTO organizations (id, name, type, active) VALUES ($1, $2, $3, $4)`,
      [id, `Curo ${type} ${id}`, type, active],
    );
    return id;
  }

  beforeAll(async () => {
    svc = await startService(AppModule);
    doctor = svc.as(UserRole.DOCTOR);
    lab = await organization('laboratory');
  });

  afterAll(() => svc.close());

  const visit = (overrides: object = {}) => ({
    id: randomUUID(),
    patientId: randomUUID(),
    appointmentId: randomUUID(),
    reasonCode: 'Cough',
    note: { subjective: 'Cough for 3 days', assessment: 'Acute bronchitis' },
    vitals: [
      { code: '8310-5', display: 'Body temperature', valueQuantity: 38.2 },
    ],
    diagnoses: [
      { code: 'J20.9', display: 'Acute bronchitis', isPrimary: true },
      { code: 'R05', display: 'Cough' },
    ],
    prescriptions: [
      { medicationCode: 'AMOX500', medicationDisplay: 'Amoxicillin 500mg' },
    ],
    labOrders: [
      {
        code: '58410-2',
        display: 'Full blood count',
        performerOrganizationId: lab,
      },
    ],
    ...overrides,
  });

  const sign = (body: object, actor = doctor) =>
    svc.api.post('/encounters/visit').set(actor.headers).send(body);

  /** How many rows of each visit record the encounter has, by table. */
  async function recordsOf(encounterId: string) {
    const counts: Record<string, number> = {};
    for (const target of VISIT_RECORDS) {
      const repo = svc.db.getRepository(target);
      const where = repo.metadata.findColumnWithPropertyName('encounterId')
        ? { encounterId }
        : { id: encounterId };
      counts[repo.metadata.tableName] = await repo.countBy(where);
    }
    return counts;
  }

  const WHOLE_VISIT = {
    encounters: 1,
    clinical_notes: 1,
    observations: 1,
    conditions: 2,
    medication_requests: 1,
    service_requests: 1,
  };
  const NOTHING = Object.fromEntries(
    Object.keys(WHOLE_VISIT).map((table) => [table, 0]),
  );

  it('records the whole visit against the encounter, by the signing doctor', async () => {
    const body = visit();

    const res = await sign(body).expect(201);

    expect(res.body).toMatchObject({
      resourceType: 'Encounter',
      id: body.id,
      status: 'completed',
    });
    expect(await recordsOf(body.id)).toEqual(WHOLE_VISIT);
    const encounter = await svc.db
      .getRepository(Encounter)
      .findOneByOrFail({ id: body.id });
    expect(encounter).toMatchObject({
      patientId: body.patientId,
      practitionerId: doctor.practitionerId,
    });
    expect(encounter.periodEnd).toBeInstanceOf(Date);
  });

  it('gives each lab order its QR label', async () => {
    const body = visit();

    await sign(body).expect(201);

    const order = await svc.db
      .getRepository(ServiceRequest)
      .findOneByOrFail({ encounterId: body.id });
    const qr = await svc.db
      .getRepository(QrCode)
      .findOneByOrFail({ serviceRequestId: order.id });
    expect(order.qrCodeId).toBe(qr.id);
    expect(parseLabQr(qr.encodedUrl)).toEqual({
      kind: 'sample',
      orderId: order.id,
    });
  });

  it('sends each lab order to the lab the doctor chose', async () => {
    const otherLab = await organization('laboratory');
    const body = visit({
      labOrders: [
        { code: '58410-2', display: 'FBC', performerOrganizationId: lab },
        { code: '4548-4', display: 'HbA1c', performerOrganizationId: otherLab },
      ],
    });

    await sign(body).expect(201);

    const orders = await svc.db
      .getRepository(ServiceRequest)
      .findBy({ encounterId: body.id });
    expect(
      Object.fromEntries(
        orders.map((o) => [o.code, o.performerOrganizationId]),
      ),
    ).toEqual({ '58410-2': lab, '4548-4': otherLab });
  });

  it('saves nothing when a test is sent to no lab, or somewhere that is not an active lab', async () => {
    const order = { code: '58410-2', display: 'FBC' };
    const elsewhere = [
      undefined,
      randomUUID(),
      await organization('pharmacy'),
      await organization('laboratory', false),
    ];

    for (const performerOrganizationId of elsewhere) {
      const body = visit({
        labOrders: [{ ...order, performerOrganizationId }],
      });
      await sign(body).expect(400);
      expect(await recordsOf(body.id)).toEqual(NOTHING);
    }
  });

  it("pulls the appointment's triage vitals into the encounter", async () => {
    const body = visit();
    const triage = await svc.db.getRepository(Observation).save({
      patientId: body.patientId,
      practitionerId: randomUUID(),
      appointmentId: body.appointmentId,
      code: '8867-4',
      display: 'Heart rate',
      valueQuantity: 88,
    });

    await sign(body).expect(201);

    await expect(
      svc.db.getRepository(Observation).findOneByOrFail({ id: triage.id }),
    ).resolves.toMatchObject({ encounterId: body.id });
  });

  it('returns the recorded visit, writing nothing more, when it is signed again', async () => {
    const body = visit();
    await sign(body).expect(201);

    const replay = await sign(body).expect(201);

    expect(replay.body).toMatchObject({ id: body.id, status: 'completed' });
    expect(await recordsOf(body.id)).toEqual(WHOLE_VISIT);
  });

  it('saves nothing when any part of the visit fails', async () => {
    const body = visit();
    // The lab order's QR label is the last thing a visit writes.
    jest.mocked(QRCode.toDataURL).mockImplementationOnce(() => {
      throw new Error('QR encoder down');
    });

    await sign(body).expect(500);

    expect(await recordsOf(body.id)).toEqual(NOTHING);
  });

  it("refuses an encounter id that is already another patient's", async () => {
    const first = visit();
    await sign(first).expect(201);

    await sign(visit({ id: first.id })).expect(409);

    expect(await recordsOf(first.id)).toEqual(WHOLE_VISIT);
  });

  it('rejects a malformed visit before writing anything', async () => {
    const body = visit({ vitals: null });

    await sign(body).expect(400);
    await sign(visit({ id: 'not-a-uuid' })).expect(400);

    expect(await recordsOf(body.id)).toEqual(NOTHING);
  });

  it('is refused to roles other than doctor and admin', async () => {
    const body = visit();

    await sign(body, svc.as(UserRole.NURSE)).expect(403);

    expect(await recordsOf(body.id)).toEqual(NOTHING);
  });
});

describe('GET /encounters/:id/lab-slip', () => {
  let svc: ServiceUnderTest;

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  it("encodes the visit, so a lab scanning it finds the visit's tests", async () => {
    const encounterId = randomUUID();

    const res = await svc.api
      .get(`/encounters/${encounterId}/lab-slip`)
      .set(svc.as(UserRole.DOCTOR).headers)
      .expect(200);

    const slip = res.body as { encodedUrl: string; qrBase64: string };
    expect(parseLabQr(slip.encodedUrl)).toEqual({ kind: 'visit', encounterId });
    expect(slip.qrBase64).toMatch(/^data:image\/png;base64,/);
  });
});
