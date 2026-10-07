import { randomUUID } from 'node:crypto';
import {
  Notification,
  Observation,
  Patient,
  QrCode,
  ServiceRequest,
} from '@curo/shared/database';
import {
  NotificationEventType,
  ServiceRequestStatus,
  UserRole,
} from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import { DiagnosticReport } from '../src/entities/diagnostic-report.entity';

describe('Lab specimens and results', () => {
  let svc: ServiceUnderTest;
  let labStaff: TestActor;

  beforeAll(async () => {
    svc = await startService(AppModule);
    labStaff = svc.as(UserRole.LAB_STAFF);
  });

  afterAll(() => svc.close());

  /** A doctor with a login, as the auth service links them: returns both ids. */
  async function doctorWithAccount() {
    const practitionerId = randomUUID();
    const userId = randomUUID();
    await svc.db.query(
      `INSERT INTO practitioners (id, "firstName", "lastName", role, "userId")
       VALUES ($1, 'Test', 'Doctor', 'DOCTOR', $2)`,
      [practitionerId, userId],
    );
    return { practitionerId, userId };
  }

  /**
   * An active two-test order with a QR label per test, as a signed visit leaves
   * it. Ordered by `requesterId`: by default a practitioner with no account.
   */
  async function orderLabs(requesterId = randomUUID()) {
    const patient = await svc.db.getRepository(Patient).save({
      patientCode: `PT-${randomUUID()}`,
      firstName: 'Nimal',
      lastName: 'Perera',
    });
    const order = await svc.db.getRepository(ServiceRequest).save({
      patientId: patient.id,
      requesterId,
      status: ServiceRequestStatus.ACTIVE,
      category: 'laboratory',
      code: 'PANEL',
      display: 'Full blood count + HbA1c',
      testPanel: [
        { code: '58410-2', display: 'Full blood count' },
        { code: '4548-4', display: 'HbA1c' },
      ],
    });
    const orderUrl = `http://localhost:3000/lab/orders/${order.id}`;
    const labels = await svc.db.getRepository(QrCode).save(
      (order.testPanel ?? []).map((test, i) => ({
        serviceRequestId: order.id,
        testCode: test.code,
        testIndex: i,
        encodedUrl: `${orderUrl}?test=${test.code}&i=${i}`,
        imageBase64: 'data:image/png;base64,',
      })),
    );
    return { order, labels };
  }

  const savedOrder = (id: string) =>
    svc.db.getRepository(ServiceRequest).findOneByOrFail({ id });

  const savedLabel = (id: string) =>
    svc.db.getRepository(QrCode).findOneByOrFail({ id });

  /** How many observations and reports an order has. */
  const recordsOf = async (serviceRequestId: string) => ({
    observations: await svc.db
      .getRepository(Observation)
      .countBy({ serviceRequestId }),
    reports: await svc.db
      .getRepository(DiagnosticReport)
      .countBy({ serviceRequestId }),
  });

  const inboxOf = (userId: string) =>
    svc.db.getRepository(Notification).findBy({ recipientId: userId });

  const scan = (qrData: string) =>
    svc.api.post('/orders/scan').set(labStaff.headers).send({ qrData });

  const enterResults = (body: object, actor = labStaff) =>
    svc.api.post('/results').set(actor.headers).send(body);

  const fbc = {
    code: '58410-2',
    display: 'Haemoglobin',
    value: 13.5,
    unit: 'g/dL',
    referenceRangeLow: '12',
    referenceRangeHigh: '16',
  };

  describe('POST /orders/scan', () => {
    it("receives the specimen and marks that test's label scanned", async () => {
      const { order, labels } = await orderLabs();
      const [, hba1c] = labels;

      const res = await scan(hba1c.encodedUrl).expect(201);

      expect(res.body).toMatchObject({
        id: order.id,
        scannedTest: { testCode: '4548-4', testIndex: 1, display: 'HbA1c' },
      });
      await expect(savedOrder(order.id)).resolves.toMatchObject({
        receivedAt: expect.any(Date) as unknown,
        performerId: labStaff.practitionerId,
      });
      await expect(savedLabel(hba1c.id)).resolves.toMatchObject({
        scannedBy: labStaff.practitionerId,
      });
      await expect(savedLabel(labels[0].id)).resolves.toMatchObject({
        scannedAt: null,
      });
    });

    it('keeps the first receipt time when the specimen is scanned again', async () => {
      const { order, labels } = await orderLabs();
      await scan(labels[0].encodedUrl).expect(201);
      const { receivedAt } = await savedOrder(order.id);

      await scan(labels[1].encodedUrl).expect(201);

      await expect(savedOrder(order.id)).resolves.toMatchObject({
        receivedAt,
      });
    });

    it('reports a label that matches no order', async () => {
      await scan(`http://localhost:3000/lab/orders/${randomUUID()}`).expect(
        404,
      );
    });
  });

  describe('POST /results', () => {
    it('records the results and a PDF report, and completes the order', async () => {
      const { order } = await orderLabs();

      const res = await enterResults({
        serviceRequestId: order.id,
        results: [fbc],
        conclusion: 'Within normal limits',
      }).expect(201);

      expect(res.body).toMatchObject({
        resourceType: 'DiagnosticReport',
        status: 'final',
        basedOn: [{ reference: `ServiceRequest/${order.id}` }],
        result: [
          expect.objectContaining({
            code: '58410-2',
            value: 13.5,
            unit: 'g/dL',
            referenceRangeLow: '12',
            referenceRangeHigh: '16',
          }),
        ],
        presentedForm: [{ contentType: 'application/pdf' }],
      });
      const report = await svc.db
        .getRepository(DiagnosticReport)
        .findOneByOrFail({ serviceRequestId: order.id });
      expect(
        Buffer.from(report.pdfBase64, 'base64').subarray(0, 5).toString(),
      ).toBe('%PDF-');
      const results = await svc.db
        .getRepository(Observation)
        .findBy({ serviceRequestId: order.id });
      expect(results).toEqual([
        expect.objectContaining({
          patientId: order.patientId,
          category: 'laboratory',
          code: '58410-2',
          valueUnit: 'g/dL',
        }),
      ]);
      expect(Number(results[0].valueQuantity)).toBe(13.5); // decimals arrive as strings
      await expect(savedOrder(order.id)).resolves.toMatchObject({
        status: ServiceRequestStatus.COMPLETED,
        completedAt: expect.any(Date) as unknown,
      });
      expect(report.performerId).toBe(labStaff.practitionerId);
    });

    it("notifies the ordering doctor's account that the results are ready", async () => {
      const doctor = await doctorWithAccount();
      const { order } = await orderLabs(doctor.practitionerId);

      const res = await enterResults({
        serviceRequestId: order.id,
        results: [fbc],
      }).expect(201);

      await expect(inboxOf(doctor.userId)).resolves.toEqual([
        expect.objectContaining({
          recipientRole: UserRole.DOCTOR,
          eventType: NotificationEventType.LAB_RESULTS_READY,
          message: expect.stringContaining('Nimal Perera') as unknown,
          relatedResourceType: 'DiagnosticReport',
          relatedResourceId: (res.body as { id: string }).id,
          isRead: false,
        }),
      ]);
    });

    it('records the results without a notification when the orderer has no account', async () => {
      const { order } = await orderLabs();

      const res = await enterResults({
        serviceRequestId: order.id,
        results: [fbc],
      }).expect(201);

      await expect(
        svc.db.getRepository(Notification).countBy({
          relatedResourceId: (res.body as { id: string }).id,
        }),
      ).resolves.toBe(0);
    });

    it('records the results when the order carries a patient id that is not a uuid', async () => {
      const doctor = await doctorWithAccount();
      const { order } = await orderLabs(doctor.practitionerId);
      await svc.db
        .getRepository(ServiceRequest)
        .update(order.id, { patientId: 'legacy-42' });

      await enterResults({
        serviceRequestId: order.id,
        results: [fbc],
      }).expect(201);

      await expect(inboxOf(doctor.userId)).resolves.toEqual([
        expect.objectContaining({
          message: expect.stringContaining('patient legacy-42') as unknown,
        }),
      ]);
    });

    it('saves nothing, and leaves the order open, when any result fails to save', async () => {
      const doctor = await doctorWithAccount();
      const { order } = await orderLabs(doctor.practitionerId);
      // valueQuantity is numeric(10,2): this overflows inside the transaction.
      const overflow = { ...fbc, code: '4548-4', value: 1e9 };

      await enterResults({
        serviceRequestId: order.id,
        results: [fbc, overflow],
      }).expect(500);

      expect(await recordsOf(order.id)).toEqual({
        observations: 0,
        reports: 0,
      });
      await expect(inboxOf(doctor.userId)).resolves.toEqual([]);
      await expect(savedOrder(order.id)).resolves.toMatchObject({
        status: ServiceRequestStatus.ACTIVE,
        completedAt: null,
      });
    });

    it('files one report, and one notification, when the same results are submitted twice at once', async () => {
      const doctor = await doctorWithAccount();
      const { order } = await orderLabs(doctor.practitionerId);
      const body = { serviceRequestId: order.id, results: [fbc] };

      const results = await Promise.all([
        enterResults(body),
        enterResults(body),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await recordsOf(order.id)).toEqual({
        observations: 1,
        reports: 1,
      });
      await expect(inboxOf(doctor.userId)).resolves.toHaveLength(1);
    });

    it('refuses results for an order that is already reported', async () => {
      const { order } = await orderLabs();
      const body = { serviceRequestId: order.id, results: [fbc] };
      await enterResults(body).expect(201);

      await enterResults(body).expect(409);

      expect(await recordsOf(order.id)).toEqual({
        observations: 1,
        reports: 1,
      });
    });

    it('rejects missing or malformed result items before writing anything', async () => {
      const { order } = await orderLabs();
      const serviceRequestId = order.id;

      await enterResults({ serviceRequestId, results: [] }).expect(400);
      await enterResults({
        serviceRequestId,
        results: [{ code: '58410-2' }], // no display
      }).expect(400);
      await enterResults({
        serviceRequestId,
        results: [{ ...fbc, value: 'high' }],
      }).expect(400);

      expect(await recordsOf(order.id)).toEqual({
        observations: 0,
        reports: 0,
      });
      await expect(savedOrder(order.id)).resolves.toMatchObject({
        status: ServiceRequestStatus.ACTIVE,
      });
    });

    it('refuses results for an order that does not exist', async () => {
      const serviceRequestId = randomUUID();

      await enterResults({ serviceRequestId, results: [fbc] }).expect(404);

      expect(await recordsOf(serviceRequestId)).toEqual({
        observations: 0,
        reports: 0,
      });
    });

    it('is refused to roles other than lab staff and admin', async () => {
      const { order } = await orderLabs();

      await enterResults(
        { serviceRequestId: order.id, results: [fbc] },
        svc.as(UserRole.DOCTOR),
      ).expect(403);

      await expect(savedOrder(order.id)).resolves.toMatchObject({
        status: ServiceRequestStatus.ACTIVE,
      });
    });
  });
});
