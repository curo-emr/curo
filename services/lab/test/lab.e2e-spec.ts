import { randomUUID } from 'node:crypto';
import { Observation, QrCode, ServiceRequest } from '@curo/shared/database';
import { ServiceRequestStatus, UserRole } from '@curo/shared/enums';
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

  /** An active two-test order with a QR label per test, as a signed visit leaves it. */
  async function orderLabs() {
    const order = await svc.db.getRepository(ServiceRequest).save({
      patientId: randomUUID(),
      requesterId: randomUUID(),
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
        performerId: labStaff.sub,
      });
      await expect(savedLabel(hba1c.id)).resolves.toMatchObject({
        scannedBy: labStaff.sub,
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
    });

    it('refuses results for an order that does not exist', async () => {
      const serviceRequestId = randomUUID();

      await enterResults({ serviceRequestId, results: [fbc] }).expect(404);

      await expect(
        svc.db.getRepository(Observation).countBy({ serviceRequestId }),
      ).resolves.toBe(0);
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
