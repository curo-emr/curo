import { MedicationRequest, Observation } from '@curo/shared/database';
import { Encounter } from '../entities/encounter.entity';
import {
  toFhirEncounter,
  toFhirMedRequest,
  toFhirObservation,
} from './fhir.mapper';

describe('toFhirEncounter', () => {
  it('references the patient, practitioner and appointment, ambulatory by default', () => {
    const fhir = toFhirEncounter(
      Object.assign(new Encounter(), {
        id: 'enc-1',
        patientId: 'patient-1',
        practitionerId: 'doctor-1',
        appointmentId: 'appt-1',
        reasonCode: 'Cough',
      }),
    );

    expect(fhir).toMatchObject({
      resourceType: 'Encounter',
      class: { code: 'AMB' },
      subject: { reference: 'Patient/patient-1' },
      participant: [{ individual: { reference: 'Practitioner/doctor-1' } }],
      appointment: [{ reference: 'Appointment/appt-1' }],
      reasonCode: [{ text: 'Cough' }],
    });
  });

  it('leaves out an appointment and reason the encounter does not have', () => {
    const fhir = toFhirEncounter(
      Object.assign(new Encounter(), { id: 'enc-2', patientId: 'p' }),
    );

    expect(fhir.appointment).toBeUndefined();
    expect(fhir.reasonCode).toBeUndefined();
  });
});

describe('toFhirMedRequest', () => {
  it('carries the dose, frequency, quantity and supply duration', () => {
    const fhir = toFhirMedRequest(
      Object.assign(new MedicationRequest(), {
        id: 'rx-1',
        patientId: 'patient-1',
        practitionerId: 'doctor-1',
        medicationCode: 'AMOX500',
        medicationDisplay: 'Amoxicillin 500mg',
        dosageText: '1 capsule three times a day',
        route: 'oral',
        frequency: 'TDS',
        quantityValue: 21,
        quantityUnit: 'capsules',
        durationDays: 7,
      }),
    );

    expect(fhir).toMatchObject({
      intent: 'order',
      requester: { reference: 'Practitioner/doctor-1' },
      dosageInstruction: [
        {
          text: '1 capsule three times a day',
          route: { text: 'oral' },
          timing: { code: { text: 'TDS' } },
        },
      ],
      dispenseRequest: {
        quantity: { value: 21, unit: 'capsules' },
        expectedSupplyDuration: { value: 7, unit: 'days' },
      },
    });
  });
});

describe('toFhirObservation', () => {
  const vital = (overrides: Partial<Observation> = {}) =>
    Object.assign(new Observation(), {
      id: 'obs-1',
      patientId: 'patient-1',
      practitionerId: 'nurse-1',
      code: '8310-5',
      display: 'Body temperature',
      valueQuantity: '38.20' as unknown as number, // decimals arrive as strings
      valueUnit: 'Cel',
      ...overrides,
    });

  it('marks triage vitals with their appointment and the role that took them', () => {
    // The doctor portal reads these to show which vitals the nurse recorded.
    const fhir = toFhirObservation(
      vital({ appointmentId: 'appt-1', performerRole: 'NURSE' }),
    );

    expect(fhir.extension).toEqual([
      { url: 'urn:curo:appointmentId', valueString: 'appt-1' },
      { url: 'urn:curo:performerRole', valueString: 'NURSE' },
    ]);
    expect(fhir.valueQuantity).toEqual({ value: 38.2, unit: 'Cel' });
  });

  it('has no extensions for a vital taken during the encounter', () => {
    const fhir = toFhirObservation(vital({ encounterId: 'enc-1' }));

    expect(fhir.extension).toEqual([]);
    expect(fhir.encounter).toEqual({ reference: 'Encounter/enc-1' });
  });

  it('leaves out a value the observation does not have', () => {
    const fhir = toFhirObservation(
      vital({ valueQuantity: null as unknown as number, valueString: 'clear' }),
    );

    expect(fhir.valueQuantity).toBeUndefined();
    expect(fhir.valueString).toBe('clear');
  });
});
