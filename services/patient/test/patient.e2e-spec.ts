import { randomUUID } from 'node:crypto';
import { Condition, Patient } from '@curo/shared/database';
import { ConditionClinicalStatus, Gender, UserRole } from '@curo/shared/enums';
import { luhnCheckDigit } from '@curo/shared/identifiers';
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

    it('saves every field the registration form collects', async () => {
      const body = newPatient({
        nationality: 'Sri Lankan',
        occupation: 'Teacher',
        tags: ['Diabetic', 'Wheelchair user'],
        insuranceProvider: 'Ceylinco',
        insuranceExpiryDate: '2027-03-31',
        insuranceHolderName: 'Kamala Perera',
        insuranceRelationship: 'spouse',
      });

      const res = await register(body).expect(201);

      await expect(savedPatient(body.lastName)).resolves.toMatchObject({
        nationality: 'Sri Lankan',
        occupation: 'Teacher',
        tags: ['Diabetic', 'Wheelchair user'],
        insuranceExpiryDate: '2027-03-31',
        insuranceHolderName: 'Kamala Perera',
        insuranceRelationship: 'spouse',
      });
      expect(res.body).toMatchObject({
        extension: expect.arrayContaining([
          { url: 'urn:curo:nationality', valueString: 'Sri Lankan' },
          { url: 'urn:curo:occupation', valueString: 'Teacher' },
          { url: 'urn:curo:tag', valueString: 'Diabetic' },
          {
            url: 'urn:curo:insurance',
            extension: expect.arrayContaining([
              { url: 'expiryDate', valueDate: '2027-03-31' },
              { url: 'relationship', valueString: 'spouse' },
            ]) as unknown,
          },
        ]) as unknown,
      });
    });

    it('records the allergies given at registration, by whoever registered the patient', async () => {
      const body = newPatient({
        allergies: [
          {
            code: 'penicillin',
            display: 'Penicillin',
            reaction: 'Rash',
            severity: 'severe',
          },
        ],
      });

      const res = await register(body).expect(201);

      const { id } = res.body as { id: string };
      await expect(
        svc.db.getRepository(AllergyIntolerance).findBy({ patientId: id }),
      ).resolves.toEqual([
        expect.objectContaining({
          display: 'Penicillin',
          criticality: 'high',
          reactions: [
            { manifestation: [{ text: 'Rash' }], severity: 'severe' },
          ],
          practitionerId: receptionist.practitionerId,
        }),
      ]);
    });

    it('registers no one when an allergy is invalid', async () => {
      const body = newPatient({ allergies: [{ display: 'No code' }] });

      await register(body).expect(400);

      await expect(savedPatient(body.lastName)).resolves.toBeNull();
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
      'every route %s can use leaves out NIC, contact, address and the rest',
      async (role) => {
        const body = newPatient({
          nic: '199012345678',
          phone: '+94771234567',
          occupation: 'Teacher',
          tags: ['Diabetic'],
          insuranceHolderName: 'Kamala Perera',
        });
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
          expect(text).not.toMatch(/Teacher|Diabetic|Kamala/);
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

    it('lets reception record an allergy the patient reports', async () => {
      const patientId = await registered();

      await svc.api
        .post(`/patients/${patientId}/allergies`)
        .set(receptionist.headers)
        .send(penicillin)
        .expect(201);
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

  describe('changing a recorded allergy', () => {
    let doctor: TestActor;
    beforeAll(() => {
      doctor = svc.as(UserRole.DOCTOR);
    });

    /** A patient with one allergy, recorded by reception, and its id. */
    async function withAllergy() {
      const res = await register(
        newPatient({
          allergies: [
            {
              code: 'aspirin',
              display: 'Aspirin',
              reaction: 'Hives',
              severity: 'mild',
            },
          ],
        }),
      ).expect(201);
      const patientId = (res.body as { id: string }).id;
      const [allergy] = await svc.db
        .getRepository(AllergyIntolerance)
        .findBy({ patientId });
      return { patientId, allergyId: allergy.id };
    }

    const listed = async (patientId: string) => {
      const [own, batch] = await Promise.all([
        svc.api
          .get(`/patients/${patientId}/allergies`)
          .set(doctor.headers)
          .expect(200),
        svc.api
          .get(`/patients/allergies?patientIds=${patientId}`)
          .set(doctor.headers)
          .expect(200),
      ]);
      return [own.body, batch.body] as { id: string }[][];
    };

    const changeAllergy = (
      patientId: string,
      allergyId: string,
      body: object,
      actor = doctor,
    ) =>
      svc.api
        .patch(`/patients/${patientId}/allergies/${allergyId}`)
        .set(actor.headers)
        .send(body);

    it('lets a doctor change the reaction, keeping who recorded it', async () => {
      const { patientId, allergyId } = await withAllergy();

      const res = await changeAllergy(patientId, allergyId, {
        severity: 'severe',
      }).expect(200);

      await expect(
        svc.db.getRepository(AllergyIntolerance).findOneBy({ id: allergyId }),
      ).resolves.toMatchObject({
        criticality: 'high',
        reactions: [{ manifestation: [{ text: 'Hives' }], severity: 'severe' }],
        practitionerId: receptionist.practitionerId,
      });
      expect(res.body).toMatchObject({ id: allergyId, criticality: 'high' });
    });

    it('retires an allergy: kept on record, no longer listed for the patient', async () => {
      const { patientId, allergyId } = await withAllergy();

      await changeAllergy(patientId, allergyId, {
        clinicalStatus: 'inactive',
      }).expect(200);

      for (const list of await listed(patientId)) {
        expect(list).toEqual([]);
      }
      await expect(
        svc.db.getRepository(AllergyIntolerance).countBy({ id: allergyId }),
      ).resolves.toBe(1);
    });

    it('lists an allergy with no status as current', async () => {
      const { patientId, allergyId } = await withAllergy();
      await svc.db
        .getRepository(AllergyIntolerance)
        .update(allergyId, { clinicalStatus: null as unknown as string });

      for (const list of await listed(patientId)) {
        expect(list).toEqual([expect.objectContaining({ id: allergyId })]);
      }
    });

    it('leaves changing and retiring to doctors', async () => {
      const { patientId, allergyId } = await withAllergy();

      await changeAllergy(
        patientId,
        allergyId,
        { clinicalStatus: 'inactive' },
        receptionist,
      ).expect(403);
    });

    it("won't change another patient's allergy", async () => {
      const { allergyId } = await withAllergy();
      const otherPatientId = await registered();

      await changeAllergy(otherPatientId, allergyId, {
        clinicalStatus: 'inactive',
      }).expect(404);

      expect(
        (
          await svc.db
            .getRepository(AllergyIntolerance)
            .findOneBy({ id: allergyId })
        )?.clinicalStatus,
      ).toBe('active');
    });

    describe('inside a patient update', () => {
      const update = (patientId: string, body: object, actor = doctor) =>
        svc.api.patch(`/patients/${patientId}`).set(actor.headers).send(body);

      it('saves the patient and the allergy changes together', async () => {
        const { patientId, allergyId } = await withAllergy();

        await update(patientId, {
          occupation: 'Farmer',
          newAllergies: [
            { code: 'peanut', display: 'Peanuts', severity: 'moderate' },
          ],
          allergyUpdates: [{ id: allergyId, clinicalStatus: 'inactive' }],
        }).expect(200);

        const [own] = await listed(patientId);
        expect(own).toEqual([
          expect.objectContaining({
            code: { coding: [{ code: 'peanut', display: 'Peanuts' }] },
          }),
        ]);
        await expect(
          svc.db.getRepository(Patient).findOneBy({ id: patientId }),
        ).resolves.toMatchObject({ occupation: 'Farmer' });
      });

      it("saves nothing when an allergy change isn't this patient's", async () => {
        const { allergyId } = await withAllergy();
        const otherPatientId = await registered();

        await update(otherPatientId, {
          occupation: 'Farmer',
          newAllergies: [{ code: 'peanut', display: 'Peanuts' }],
          allergyUpdates: [{ id: allergyId, clinicalStatus: 'inactive' }],
        }).expect(404);

        await expect(
          svc.db.getRepository(Patient).findOneBy({ id: otherPatientId }),
        ).resolves.toMatchObject({ occupation: null });
        await expect(
          svc.db
            .getRepository(AllergyIntolerance)
            .countBy({ patientId: otherPatientId }),
        ).resolves.toBe(0);
      });

      it('lets reception add allergies but not change them, and then saves nothing', async () => {
        const { patientId, allergyId } = await withAllergy();

        await update(
          patientId,
          { newAllergies: [{ code: 'peanut', display: 'Peanuts' }] },
          receptionist,
        ).expect(200);
        await update(
          patientId,
          {
            occupation: 'Farmer',
            allergyUpdates: [{ id: allergyId, clinicalStatus: 'inactive' }],
          },
          receptionist,
        ).expect(403);

        expect(await listed(patientId).then(([own]) => own.length)).toBe(2);
        await expect(
          svc.db.getRepository(Patient).findOneBy({ id: patientId }),
        ).resolves.toMatchObject({ occupation: null });
      });
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

  describe('GET /patients', () => {
    it('counts the patients registered within whole days', async () => {
      const family = `Silva-${randomUUID()}`;
      const registeredOn = async (date: Date) => {
        const res = await register(newPatient({ lastName: family })).expect(
          201,
        );
        await svc.db
          .getRepository(Patient)
          .update((res.body as { id: string }).id, { createdAt: date });
      };
      await registeredOn(new Date(2031, 2, 5, 0, 0));
      await registeredOn(new Date(2031, 2, 6, 23, 59));
      await registeredOn(new Date(2031, 2, 7, 0, 0));

      const res = await svc.api
        .get('/patients')
        .query({
          search: family,
          registeredFrom: '2031-03-05',
          registeredTo: '2031-03-06',
          pageSize: 1,
        })
        .set(receptionist.headers)
        .expect(200);
      expect((res.body as { total: number }).total).toBe(2);
    });
  });
});
