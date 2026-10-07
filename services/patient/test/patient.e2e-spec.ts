import { randomUUID } from 'node:crypto';
import { Condition, Patient } from '@curo/shared/database';
import { ConditionClinicalStatus, Gender, UserRole } from '@curo/shared/enums';
import {
  startService,
  type ServiceUnderTest,
  type TestActor,
} from '@curo/testing';
import { AppModule } from '../src/app.module';
import { AllergyIntolerance } from '../src/entities/allergy-intolerance.entity';
import {
  AllergyIntoleranceCriticality,
  AllergyIntoleranceType,
} from '../src/enums';
import { luhnCheckDigit } from '../src/patient/phn';

describe('Patient records', () => {
  let svc: ServiceUnderTest;
  let receptionist: TestActor;

  beforeAll(async () => {
    svc = await startService(AppModule);
    receptionist = svc.as(UserRole.RECEPTIONIST);
  });

  afterAll(() => svc.close());

  const newPatient = (overrides: object = {}) => ({
    firstName: 'Nimal',
    lastName: `Perera-${randomUUID()}`,
    birthDate: '1990-04-12',
    gender: Gender.MALE,
    ...overrides,
  });

  const register = (body: object, actor = receptionist) =>
    svc.api.post('/patients').set(actor.headers).send(body);

  const savedPatient = (lastName: string) =>
    svc.db.getRepository(Patient).findOneBy({ lastName });

  describe('POST /patients', () => {
    it('registers a patient with a patient code and a valid Personal Health Number', async () => {
      const body = newPatient();

      const res = await register(body).expect(201);

      const saved = await savedPatient(body.lastName);
      expect(saved).toMatchObject({ firstName: 'Nimal', active: true });
      const phn = saved!.personalHealthNumber;
      expect(phn).toMatch(/^\d{12}$/);
      expect(phn.slice(0, 4)).toBe(new Date().getFullYear().toString());
      expect(Number(phn[11])).toBe(luhnCheckDigit(phn.slice(0, 11)));
      expect(saved!.patientCode).toMatch(/^CUR-[A-Z0-9]{8}$/);
      expect(res.body).toMatchObject({
        resourceType: 'Patient',
        id: saved!.id,
        identifier: expect.arrayContaining([
          { use: 'official', system: 'urn:curo:phn', value: phn },
          { system: 'urn:curo:patient-code', value: saved!.patientCode },
        ]) as unknown,
      });
    });

    it('keeps a Personal Health Number the patient already has', async () => {
      const body = newPatient({ personalHealthNumber: '201912345679' });

      await register(body).expect(201);

      await expect(savedPatient(body.lastName)).resolves.toMatchObject({
        personalHealthNumber: '201912345679',
      });
    });

    it('rejects a registration without the required details', async () => {
      const body = newPatient({ firstName: '', gender: 'robot' });

      const res = await register(body).expect(400);

      expect(res.body).toMatchObject({
        message: expect.arrayContaining([
          'firstName should not be empty',
        ]) as unknown,
      });
      await expect(savedPatient(body.lastName)).resolves.toBeNull();
    });

    it('is refused to patients and lab staff', async () => {
      for (const role of [UserRole.PATIENT, UserRole.LAB_STAFF]) {
        const body = newPatient();
        await register(body, svc.as(role)).expect(403);
        await expect(savedPatient(body.lastName)).resolves.toBeNull();
      }
    });
  });

  /** A registered patient's id. */
  async function registered(): Promise<string> {
    const body = newPatient();
    await register(body).expect(201);
    return (await savedPatient(body.lastName))!.id;
  }

  describe('reading a patient as pharmacy or lab staff', () => {
    it.each([UserRole.PHARMACIST, UserRole.LAB_STAFF])(
      'every route %s can use leaves out NIC, contact and address',
      async (role) => {
        const body = newPatient({ nic: '199012345678', phone: '+94771234567' });
        await register(body).expect(201);
        const { id, patientCode } = (await savedPatient(body.lastName))!;
        const actor = svc.as(role);

        const reads = await Promise.all(
          [
            `/patients/${id}`,
            `/patients/code/${patientCode}`,
            `/patients?search=${body.lastName}`,
          ].map((path) => svc.api.get(path).set(actor.headers).expect(200)),
        );

        for (const { text } of reads) {
          expect(text).toContain(id);
          expect(text).not.toContain('199012345678');
          expect(text).not.toContain('+94771234567');
        }
      },
    );
  });

  describe('POST /patients/:id/allergies', () => {
    const penicillin = {
      type: AllergyIntoleranceType.ALLERGY,
      criticality: AllergyIntoleranceCriticality.HIGH,
      code: 'PEN',
      display: 'Penicillin',
    };

    it("records an allergy on the patient's chart, by the doctor's practitioner record", async () => {
      const patientId = await registered();
      const doctor = svc.as(UserRole.DOCTOR);

      const res = await svc.api
        .post(`/patients/${patientId}/allergies`)
        .set(doctor.headers)
        .send(penicillin)
        .expect(201);

      await expect(
        svc.db.getRepository(AllergyIntolerance).findBy({ patientId }),
      ).resolves.toEqual([
        expect.objectContaining({
          code: 'PEN',
          criticality: 'high',
          practitionerId: doctor.practitionerId,
        }),
      ]);
      expect(res.body).toMatchObject({
        recorder: { reference: `Practitioner/${doctor.practitionerId}` },
      });
    });

    it('refuses an allergy for a patient who does not exist', async () => {
      const patientId = randomUUID();

      await svc.api
        .post(`/patients/${patientId}/allergies`)
        .set(svc.as(UserRole.DOCTOR).headers)
        .send(penicillin)
        .expect(404);

      await expect(
        svc.db.getRepository(AllergyIntolerance).countBy({ patientId }),
      ).resolves.toBe(0);
    });
  });

  describe('POST /patients/:id/conditions', () => {
    it("records a condition on the patient's chart, by the doctor's practitioner record", async () => {
      const patientId = await registered();
      const doctor = svc.as(UserRole.DOCTOR);

      await svc.api
        .post(`/patients/${patientId}/conditions`)
        .set(doctor.headers)
        .send({
          clinicalStatus: ConditionClinicalStatus.ACTIVE,
          code: 'E11.9',
          display: 'Type 2 diabetes mellitus',
        })
        .expect(201);

      await expect(
        svc.db.getRepository(Condition).findBy({ patientId }),
      ).resolves.toEqual([
        expect.objectContaining({
          code: 'E11.9',
          practitionerId: doctor.practitionerId,
        }),
      ]);
    });
  });
});
