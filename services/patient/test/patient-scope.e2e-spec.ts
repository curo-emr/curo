import { randomUUID } from 'node:crypto';
import { UserRole } from '@curo/shared/enums';
import { startService, type ServiceUnderTest } from '@curo/testing';
import { AppModule } from '../src/app.module';

// A patient signed in to the patient portal reads only their own record.
describe("A patient reads only their own record's parts", () => {
  let svc: ServiceUnderTest;

  beforeAll(async () => {
    svc = await startService(AppModule);
  });

  afterAll(() => svc.close());

  it.each(['allergies', 'conditions', 'vitals'])(
    "serves their own %s and refuses another patient's",
    async (part) => {
      const ownId = randomUUID();
      const patient = svc.as(UserRole.PATIENT, { patientId: ownId });

      await svc.api
        .get(`/patients/${randomUUID()}/${part}`)
        .set(patient.headers)
        .expect(403);
      await svc.api
        .get(`/patients/${ownId}/${part}`)
        .set(patient.headers)
        .expect(200);
    },
  );

  it("still shows a doctor any patient's allergies", async () => {
    await svc.api
      .get(`/patients/${randomUUID()}/allergies`)
      .set(svc.as(UserRole.DOCTOR).headers)
      .expect(200);
  });
});
