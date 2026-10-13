import { Observation } from '@curo/shared/database';
import { UserRole } from '@curo/shared/enums';
import {
  registerPatient,
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';

describe('POST /vitals', () => {
  let svc: ServiceUnderTest;
  let nurse: TestActor;
  let patientId: string;

  beforeAll(async () => {
    svc = await startService(AppModule);
    nurse = await svc.as(UserRole.NURSE);
    patientId = await registerPatient(svc.db);
  });

  afterAll(() => svc.close());

  const record = (code: string, valueQuantity: number) =>
    svc.api
      .post('/vitals')
      .set(nurse.headers)
      .send({ patientId, code, display: code, valueQuantity });

  const saved = () => svc.db.getRepository(Observation).countBy({ patientId });

  it.each([
    ['8310-5', 36.6], // temperature, °C
    ['8867-4', 72], // heart rate
    ['8480-6', 120], // systolic
    ['29463-7', 3.2], // a newborn's weight
  ])('records a plausible %s reading of %p', async (code, value) => {
    await record(code, value).expect(201);
  });

  it.each([
    ['8310-5', 500], // temperature, °C
    ['8310-5', 98.6], // temperature in °F, not the °C it is stored in
    ['8867-4', -10], // heart rate
    ['2708-6', 101], // oxygen saturation, %
    ['8302-2', 0], // height
  ])(
    'refuses an impossible %s reading of %p, saving nothing',
    async (code, value) => {
      const before = await saved();
      const res = await record(code, value).expect(400);
      expect(JSON.stringify(res.body)).toContain('valueQuantity');
      expect(await saved()).toBe(before);
    },
  );

  it('records an observation it has no range for as given', async () => {
    await record('39156-5', 22.5).expect(201); // BMI
  });
});
