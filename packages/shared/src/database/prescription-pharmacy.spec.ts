import {
  assertDispensedBy,
  dispensedBy,
  dispensedBySql,
} from './prescription-pharmacy';

describe('dispensedBy', () => {
  const rx = (
    performerOrganizationId: string | null,
    boughtOutside = false,
  ) => ({
    performerOrganizationId,
    boughtOutside,
  });

  it('is the pharmacy the prescription was sent to', () => {
    expect(dispensedBy(rx('colombo'), 'colombo')).toBe(true);
    expect(dispensedBy(rx('colombo'), 'kandy')).toBe(false);
  });

  it('is any pharmacy for one written before prescriptions named one', () => {
    expect(dispensedBy(rx(null), 'kandy')).toBe(true);
  });

  it('is no pharmacy for one bought outside', () => {
    expect(dispensedBy(rx(null, true), 'kandy')).toBe(false);
  });
});

describe('assertDispensedBy', () => {
  it('says why another pharmacy may not dispense it', () => {
    const sentTo = { performerOrganizationId: 'colombo', boughtOutside: false };
    expect(() => assertDispensedBy(sentTo, 'colombo')).not.toThrow();
    expect(() => assertDispensedBy(sentTo, 'kandy')).toThrow(
      'This prescription was sent to another pharmacy',
    );
    expect(() =>
      assertDispensedBy(
        { performerOrganizationId: null, boughtOutside: true },
        'kandy',
      ),
    ).toThrow(
      'The patient buys this prescription at a pharmacy of their choice',
    );
  });
});

describe('dispensedBySql', () => {
  it("scopes to the bound pharmacy, leaving out what's bought outside", () => {
    expect(dispensedBySql('m', 'colombo')).toBe(
      'NOT m."boughtOutside" AND (m."performerOrganizationId" = :pharmacy OR m."performerOrganizationId" IS NULL)',
    );
  });

  it('binds the pharmacy under the name given', () => {
    expect(dispensedBySql('m', 'colombo', 'workplace')).toContain(
      '= :workplace',
    );
  });

  it('with no pharmacy, leaves out only what is bought outside', () => {
    expect(dispensedBySql('m', null)).toBe('NOT m."boughtOutside"');
  });
});
