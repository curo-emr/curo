import { randomUUID } from 'node:crypto';
import { ServiceRequest } from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import { DiagnosticReport } from '../src/entities/diagnostic-report.entity';

// A patient signed in to the patient portal reads only their own lab work.
describe('A patient reads only their own lab orders and reports', () => {
  let svc: ServiceUnderTest;
  let patient: TestActor;
  let own: LabWork;
  let other: LabWork;

  interface LabWork {
    patientId: string;
    orderId: string;
    reportId: string;
  }

  /** A glucose order for `patientId`, with its report. */
  async function labWorkOf(patientId: string): Promise<LabWork> {
    const { id: orderId } = await svc.db.getRepository(ServiceRequest).save({
      patientId,
      requesterId: randomUUID(),
      code: '2345-7',
      display: 'Glucose',
    });
    const { id: reportId } = await svc.db.getRepository(DiagnosticReport).save({
      patientId,
      serviceRequestId: orderId,
      performerId: randomUUID(),
      code: '2345-7',
      display: 'Glucose',
    });
    return { patientId, orderId, reportId };
  }

  beforeAll(async () => {
    svc = await startService(AppModule);
    own = await labWorkOf(randomUUID());
    other = await labWorkOf(randomUUID());
    patient = svc.as(UserRole.PATIENT, { patientId: own.patientId });
  });

  afterAll(() => svc.close());

  const get = (path: string, actor: TestActor) =>
    svc.api.get(path).set(actor.headers);

  const reportIds = async (path: string, actor: TestActor) =>
    (
      (await get(path, actor).expect(200)).body as {
        entry: { resource: { id: string } }[];
      }
    ).entry.map((e) => e.resource.id);

  it("lists only their own reports, and refuses another patient's", async () => {
    expect(await reportIds('/reports', patient)).toEqual([own.reportId]);
    await get(`/reports?patientId=${other.patientId}`, patient).expect(403);
  });

  it("finds no order or report of another patient's by id", async () => {
    await get(`/orders/${other.orderId}`, patient).expect(404);
    await get(`/reports/${other.reportId}`, patient).expect(404);
    await get(`/orders/${own.orderId}`, patient).expect(200);
    await get(`/reports/${own.reportId}`, patient).expect(200);
  });

  it("still shows a doctor every patient's reports", async () => {
    const doctor = svc.as(UserRole.DOCTOR);
    await get(`/reports/${other.reportId}`, doctor).expect(200);
    await get(`/orders/${other.orderId}`, doctor).expect(200);
  });

  it('turns away a patient login linked to no record', async () => {
    await get('/reports', svc.as(UserRole.PATIENT, { patientId: null })).expect(
      403,
    );
  });
});
