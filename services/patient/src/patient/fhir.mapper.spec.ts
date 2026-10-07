import { Observation, Patient } from '@curo/shared/database';
import { Gender, UserRole } from '@curo/shared/enums';
import { toFhirObservation, toFhirPatient } from './fhir.mapper';

/** A patient with every optional detail filled in. */
const patient = Object.assign(new Patient(), {
  id: 'patient-1',
  patientCode: 'CUR-AB12CD34',
  personalHealthNumber: '202600000006',
  nic: '199012345678',
  passportNumber: 'N1234567',
  firstName: 'Nimal',
  middleName: 'Kumara',
  lastName: 'Perera',
  gender: Gender.MALE,
  birthDate: '1990-04-12',
  phone: '+94771234567',
  email: 'nimal@example.com',
  addressLine1: '12 Galle Road',
  city: 'Colombo',
  bloodType: 'O+',
  emergencyContactName: 'Kamala Perera',
  emergencyContactPhone: '+94777654321',
  insuranceProvider: 'Ceylinco',
  insurancePolicyNumber: 'P-1',
  active: true,
});

describe('toFhirPatient', () => {
  it.each([UserRole.PHARMACIST, UserRole.LAB_STAFF])(
    'gives %s only who the patient is, nothing more',
    (role) => {
      const fhir = toFhirPatient(patient, role);

      expect(Object.keys(fhir).sort()).toEqual([
        'active',
        'birthDate',
        'gender',
        'id',
        'identifier',
        'meta',
        'name',
        'resourceType',
      ]);
      expect(fhir.identifier).toEqual([
        { use: 'official', system: 'urn:curo:phn', value: '202600000006' },
        { system: 'urn:curo:patient-code', value: 'CUR-AB12CD34' },
      ]);
      const json = JSON.stringify(fhir);
      for (const secret of ['199012345678', 'N1234567', '+9477', 'Galle', 'O+'])
        expect(json).not.toContain(secret);
    },
  );

  it.each([
    UserRole.DOCTOR,
    UserRole.NURSE,
    UserRole.RECEPTIONIST,
    UserRole.SUPER_ADMIN,
    UserRole.PATIENT,
    undefined,
  ])('gives %s the full record', (role) => {
    const fhir = toFhirPatient(patient, role);

    expect(fhir).toMatchObject({
      identifier: expect.arrayContaining([
        { system: 'urn:curo:nic', value: '199012345678' },
        { system: 'urn:curo:passport', value: 'N1234567' },
      ]) as unknown,
      telecom: [
        { system: 'phone', value: '+94771234567', use: 'mobile' },
        { system: 'email', value: 'nimal@example.com' },
      ],
      address: [expect.objectContaining({ city: 'Colombo' })],
      contact: [expect.objectContaining({ name: { text: 'Kamala Perera' } })],
    });
  });

  it('names the patient in FHIR order, without empty parts', () => {
    const noMiddle = Object.assign(new Patient(), {
      ...patient,
      middleName: null,
    });

    expect(toFhirPatient(noMiddle).name).toEqual([
      { use: 'official', family: 'Perera', given: ['Nimal'] },
    ]);
  });

  it('leaves out identifiers and details the patient does not have', () => {
    const minimal = Object.assign(new Patient(), {
      id: 'patient-2',
      patientCode: 'CUR-ZZ99ZZ99',
      firstName: 'Ama',
      lastName: 'Silva',
    });

    const fhir = toFhirPatient(minimal);

    expect(fhir.identifier).toEqual([
      { system: 'urn:curo:patient-code', value: 'CUR-ZZ99ZZ99' },
    ]);
    expect(fhir).toMatchObject({ telecom: [], address: [], contact: [] });
  });
});

describe('toFhirObservation', () => {
  it('turns decimal columns, which arrive as strings, back into numbers', () => {
    const fhir = toFhirObservation(
      Object.assign(new Observation(), {
        id: 'obs-1',
        patientId: 'patient-1',
        practitionerId: 'doctor-1',
        code: '718-7',
        display: 'Haemoglobin',
        valueQuantity: '13.50' as unknown as number,
        valueUnit: 'g/dL',
        referenceRangeLow: '12',
        referenceRangeHigh: '16',
      }),
    );

    expect(fhir).toMatchObject({
      subject: { reference: 'Patient/patient-1' },
      performer: [{ reference: 'Practitioner/doctor-1' }],
      valueQuantity: { value: 13.5, unit: 'g/dL' },
      referenceRange: [{ low: { value: 12 }, high: { value: 16 } }],
    });
  });
});
