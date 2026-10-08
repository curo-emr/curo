import { AllergyIntoleranceCriticality } from '../enums';
import { allergyColumns, isCurrentAllergy } from './allergy-records';
import type { AllergyIntolerance } from '../entities/allergy-intolerance.entity';

describe('allergyColumns', () => {
  it('copies only allergy fields, never ids, the patient or the recorder', () => {
    const request = {
      code: 'peanut',
      display: 'Peanuts',
      id: 'x',
      patientId: 'y',
      practitionerId: 'z',
    };

    expect(allergyColumns(request)).toEqual({
      code: 'peanut',
      display: 'Peanuts',
    });
  });

  it('makes a severe reaction high criticality, any other low, unless criticality is given', () => {
    expect(allergyColumns({ severity: 'severe' }).criticality).toBe('high');
    expect(allergyColumns({ severity: 'moderate' }).criticality).toBe('low');
    expect(
      allergyColumns({
        severity: 'severe',
        criticality: AllergyIntoleranceCriticality.LOW,
      }).criticality,
    ).toBe('low');
    expect(allergyColumns({ display: 'Peanuts' })).not.toHaveProperty(
      'criticality',
    );
  });

  it('keeps the part of the reaction a change leaves out', () => {
    const existing = {
      reactions: [{ manifestation: [{ text: 'Hives' }], severity: 'mild' }],
    } as unknown as AllergyIntolerance;

    expect(allergyColumns({ severity: 'severe' }, existing).reactions).toEqual([
      { manifestation: [{ text: 'Hives' }], severity: 'severe' },
    ]);
    expect(
      allergyColumns({ reaction: 'Swelling' }, existing).reactions,
    ).toEqual([{ manifestation: [{ text: 'Swelling' }], severity: 'mild' }]);
  });
});

describe('isCurrentAllergy', () => {
  it('counts a missing or unknown status as current, and only retired ones as not', () => {
    const status = (clinicalStatus: string | null) =>
      isCurrentAllergy({ clinicalStatus } as AllergyIntolerance);

    expect(status('active')).toBe(true);
    expect(status(null)).toBe(true);
    expect(status('unconfirmed')).toBe(true);
    expect(status('inactive')).toBe(false);
    expect(status('resolved')).toBe(false);
  });
});
