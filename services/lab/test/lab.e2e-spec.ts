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
import { LabInstrument } from '../src/entities/lab-instrument.entity';
import { QCLog, QCStatus } from '../src/entities/qc-log.entity';
import { InstrumentStatus } from '../src/enums';

describe('Lab specimens and results', () => {
  let svc: ServiceUnderTest;
  let lab: string;
  let labStaff: TestActor;

  /** A laboratory, as the auth service keeps them; returns its id. */
  async function laboratory(name = `Curo Lab ${randomUUID()}`) {
    const id = randomUUID();
    await svc.db.query(
      `INSERT INTO organizations (id, name, type) VALUES ($1, $2, 'laboratory')`,
      [id, name],
    );
    return id;
  }

  /** A technician working at `labId`. */
  const technicianAt = (labId: string) =>
    svc.as(UserRole.LAB_STAFF, { organizationId: labId });

  beforeAll(async () => {
    svc = await startService(AppModule);
    lab = await laboratory();
    labStaff = technicianAt(lab);
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
   * it, sent to `performerOrganizationId` (by default the technician's lab).
   * Ordered by `requesterId`: by default a practitioner with no account.
   */
  async function orderLabs(
    requesterId = randomUUID(),
    { performerOrganizationId = lab, encounterId = randomUUID() } = {},
  ) {
    const patient = await svc.db.getRepository(Patient).save({
      patientCode: `PT-${randomUUID()}`,
      firstName: 'Nimal',
      lastName: 'Perera',
    });
    const order = await svc.db.getRepository(ServiceRequest).save({
      patientId: patient.id,
      requesterId,
      encounterId,
      performerOrganizationId,
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

  const scan = (qrData: string, actor = labStaff) =>
    svc.api.post('/orders/scan').set(actor.headers).send({ qrData });

  /** A report file the lab uploaded for `order`, as the document service keeps it. */
  const uploadReport = (order: ServiceRequest) =>
    svc.db.query(
      `INSERT INTO document_references
         ("patientId", "authorId", type, "relatedResourceId", "relatedResourceType", "fileName")
       VALUES ($1, $2, 'lab-report', $3, 'ServiceRequest', 'fbc.pdf')`,
      [order.patientId, labStaff.practitionerId, order.id],
    );

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

    it("refuses another lab's sample, saying which lab it is for", async () => {
      const galle = await laboratory('Curo Diagnostics — Galle');
      const { order, labels } = await orderLabs(undefined, {
        performerOrganizationId: galle,
      });

      const res = await scan(labels[0].encodedUrl).expect(403);

      expect(res.body).toMatchObject({
        message: 'This sample is for Curo Diagnostics — Galle, not your lab.',
      });
      await expect(savedOrder(order.id)).resolves.toMatchObject({
        receivedAt: null,
      });
      await expect(savedLabel(labels[0].id)).resolves.toMatchObject({
        scannedAt: null,
      });
    });

    it("finds a visit slip's tests for the scanner's lab, and receives nothing", async () => {
      const encounterId = randomUUID();
      const ours = await orderLabs(undefined, { encounterId });
      await orderLabs(undefined, {
        encounterId,
        performerOrganizationId: await laboratory(),
      });

      const res = await scan(
        `http://localhost:3000/lab/visits/${encounterId}`,
      ).expect(201);

      expect(res.body).toMatchObject({
        resourceType: 'Bundle',
        total: 1,
        entry: [{ resource: { id: ours.order.id } }],
      });
      await expect(savedOrder(ours.order.id)).resolves.toMatchObject({
        receivedAt: null,
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

    it('completes the order with the report the lab uploaded, when no values are typed', async () => {
      const { order } = await orderLabs();
      await uploadReport(order);

      const res = await enterResults({
        serviceRequestId: order.id,
        conclusion: 'See attached report',
      }).expect(201);

      expect(res.body).toMatchObject({
        status: 'final',
        result: [],
        conclusion: 'See attached report',
        presentedForm: [],
      });
      expect(await recordsOf(order.id)).toEqual({
        observations: 0,
        reports: 1,
      });
      await expect(savedOrder(order.id)).resolves.toMatchObject({
        status: ServiceRequestStatus.COMPLETED,
      });
    });

    it('rejects missing or malformed result items before writing anything', async () => {
      const { order } = await orderLabs();
      const serviceRequestId = order.id;

      await enterResults({ serviceRequestId }).expect(400);
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

  describe('GET /orders', () => {
    it("lists only one patient's orders when asked for that patient", async () => {
      const mine = await orderLabs();
      await orderLabs(); // another patient's, at the same lab
      const res = await svc.api
        .get('/orders')
        .query({ patientId: mine.order.patientId })
        .set(labStaff.headers)
        .expect(200);
      const body = res.body as {
        total: number;
        entry: { resource: { id: string } }[];
      };
      expect(body.total).toBe(1);
      expect(body.entry.map((e) => e.resource.id)).toEqual([mine.order.id]);
    });
  });

  describe("one lab's work, kept from another", () => {
    it("shows a technician only their own lab's orders and reports", async () => {
      const otherLab = await laboratory();
      const encounterId = randomUUID();
      const ours = await orderLabs(undefined, { encounterId });
      const theirs = await orderLabs(undefined, {
        encounterId,
        performerOrganizationId: otherLab,
      });
      for (const { order } of [ours, theirs])
        await enterResults(
          { serviceRequestId: order.id, results: [fbc] },
          svc.as(UserRole.SUPER_ADMIN),
        ).expect(201);

      const ids = async (path: string, actor: TestActor) => {
        const res = await svc.api
          .get(path)
          .query({ encounterId })
          .set(actor.headers)
          .expect(200);
        return (
          res.body as { entry: { resource: { id: string } }[] }
        ).entry.map((e) => e.resource.id);
      };
      const reportOf = async (orderId: string) =>
        (
          await svc.db
            .getRepository(DiagnosticReport)
            .findOneByOrFail({ serviceRequestId: orderId })
        ).id;

      expect(await ids('/orders', labStaff)).toEqual([ours.order.id]);
      expect(await ids('/reports', labStaff)).toEqual([
        await reportOf(ours.order.id),
      ]);
      // The doctor sees the whole visit.
      expect((await ids('/orders', svc.as(UserRole.DOCTOR))).sort()).toEqual(
        [ours.order.id, theirs.order.id].sort(),
      );
      await svc.api
        .get(`/orders/${theirs.order.id}`)
        .set(labStaff.headers)
        .expect(404);
      await svc.api
        .get(`/reports/${await reportOf(theirs.order.id)}`)
        .set(labStaff.headers)
        .expect(404);
    });

    it("refuses to receive or report on another lab's order", async () => {
      const { order } = await orderLabs(undefined, {
        performerOrganizationId: await laboratory(),
      });

      await svc.api
        .put(`/orders/${order.id}/receive`)
        .set(labStaff.headers)
        .expect(404);
      await enterResults({ serviceRequestId: order.id, results: [fbc] }).expect(
        404,
      );

      await expect(savedOrder(order.id)).resolves.toMatchObject({
        status: ServiceRequestStatus.ACTIVE,
        receivedAt: null,
      });
    });

    it('refuses a technician who is not assigned to a lab', async () => {
      const res = await svc.api
        .get('/orders')
        .set(svc.as(UserRole.LAB_STAFF).headers)
        .expect(403);

      expect(res.body).toMatchObject({
        message: expect.stringContaining('assigned to a laboratory') as unknown,
      });
    });
  });

  describe("one lab's instruments and QC, kept from another", () => {
    /** An instrument in `labId`, with one passing QC run on it. */
    async function instrumentAt(labId: string) {
      const instrument = await svc.db.getRepository(LabInstrument).save({
        organizationId: labId,
        name: `Sysmex XN-550 ${randomUUID()}`,
      });
      const qcLog = await svc.db.getRepository(QCLog).save({
        instrumentId: instrument.id,
        testCode: '58410-2',
        controlLevel: 'normal',
        expectedValue: 13.5,
        observedValue: 13.4,
        status: QCStatus.PASS,
        performedBy: randomUUID(),
        performedAt: new Date(),
      });
      return { instrument, qcLog };
    }

    const instrumentIds = async (actor: TestActor) => {
      const res = await svc.api
        .get('/instruments')
        .set(actor.headers)
        .expect(200);
      return (res.body as { id: string }[]).map((i) => i.id);
    };

    const qcLogIds = async (actor: TestActor, query = {}) => {
      const res = await svc.api
        .get('/qc-logs')
        .query(query)
        .set(actor.headers)
        .expect(200);
      return (res.body as { entry: { resource: { id: string } }[] }).entry.map(
        (e) => e.resource.id,
      );
    };

    const addInstrument = (body: object, actor: TestActor) =>
      svc.api.post('/instruments').set(actor.headers).send(body);

    it("shows a technician only their own lab's instruments and QC logs", async () => {
      const ours = await instrumentAt(lab);
      const theirs = await instrumentAt(await laboratory());

      const instruments = await instrumentIds(labStaff);
      expect(instruments).toContain(ours.instrument.id);
      expect(instruments).not.toContain(theirs.instrument.id);
      const logs = await qcLogIds(labStaff);
      expect(logs).toContain(ours.qcLog.id);
      expect(logs).not.toContain(theirs.qcLog.id);
      await expect(
        qcLogIds(labStaff, { instrumentId: theirs.instrument.id }),
      ).resolves.toEqual([]);
      // The admin sees every lab's.
      expect(await instrumentIds(svc.as(UserRole.SUPER_ADMIN))).toEqual(
        expect.arrayContaining([ours.instrument.id, theirs.instrument.id]),
      );
    });

    it("refuses to change another lab's instrument", async () => {
      const { instrument } = await instrumentAt(await laboratory());

      await svc.api
        .put(`/instruments/${instrument.id}/status`)
        .set(labStaff.headers)
        .send({ status: InstrumentStatus.OFFLINE })
        .expect(404);

      await expect(
        svc.db
          .getRepository(LabInstrument)
          .findOneByOrFail({ id: instrument.id }),
      ).resolves.toMatchObject({ status: InstrumentStatus.OPERATIONAL });
    });

    it("adds a technician's instrument to their own lab, whichever lab is named", async () => {
      const res = await addInstrument(
        { name: 'Beckman AU480', organizationId: await laboratory() },
        labStaff,
      ).expect(201);

      expect(res.body).toMatchObject({ organizationId: lab });
    });

    it('has the admin name the active laboratory an instrument is in', async () => {
      const admin = svc.as(UserRole.SUPER_ADMIN);

      await addInstrument({ name: 'Beckman AU480' }, admin).expect(400);
      const res = await addInstrument(
        { name: 'Beckman AU480', organizationId: lab },
        admin,
      ).expect(201);

      expect(res.body).toMatchObject({ organizationId: lab });
    });
  });

  describe('GET /orders/:id', () => {
    it('has a label to print for a single-test order', async () => {
      const order = await svc.db.getRepository(ServiceRequest).save({
        patientId: randomUUID(),
        requesterId: randomUUID(),
        performerOrganizationId: lab,
        status: ServiceRequestStatus.ACTIVE,
        code: '58410-2',
        display: 'Full blood count',
      });
      const label = await svc.db.getRepository(QrCode).save({
        serviceRequestId: order.id,
        encodedUrl: `http://localhost:3000/lab/orders/${order.id}`,
        imageBase64: 'data:image/png;base64,label',
      });
      await svc.db
        .getRepository(ServiceRequest)
        .update(order.id, { qrCodeId: label.id });

      const res = await svc.api
        .get(`/orders/${order.id}`)
        .set(labStaff.headers)
        .expect(200);

      expect(res.body).toMatchObject({
        performer: [{ reference: `Organization/${lab}` }],
        tests: [
          {
            testCode: '58410-2',
            display: 'Full blood count',
            qrBase64: 'data:image/png;base64,label',
          },
        ],
      });
    });
  });
});
