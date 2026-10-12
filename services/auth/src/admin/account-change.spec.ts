import { accountChange, type AccountFields } from './account-change';

describe('accountChange', () => {
  const pharmacist: AccountFields = {
    isActive: true,
    firstName: 'Kasun',
    lastName: 'Perera',
    phone: '0771234567',
    organizationId: 'colombo',
  };

  it('is null when nothing differs, as when the same values are sent again', () => {
    expect(accountChange(pharmacist, { ...pharmacist })).toBeNull();
  });

  it('says the account was suspended, or reactivated', () => {
    const suspended = { ...pharmacist, isActive: false };

    expect(accountChange(pharmacist, suspended)).toEqual({
      changes: { before: { isActive: true }, after: { isActive: false } },
      description: 'Admin suspended the account',
    });
    expect(accountChange(suspended, pharmacist)?.description).toBe(
      'Admin reactivated the account',
    );
  });

  it('names both workplaces for a move', () => {
    const moved = { ...pharmacist, organizationId: 'kandy' };

    expect(
      accountChange(pharmacist, moved, {
        from: 'Curo Pharmacy Colombo',
        to: 'Curo Pharmacy Kandy',
      }),
    ).toEqual({
      changes: {
        before: { organizationId: 'colombo' },
        after: { organizationId: 'kandy' },
      },
      description:
        'Admin moved them from Curo Pharmacy Colombo to Curo Pharmacy Kandy',
    });
  });

  it('lists the details changed, naming a first or last name change once', () => {
    const corrected = {
      ...pharmacist,
      firstName: 'Kasun J.',
      lastName: 'Perera-Silva',
      licenseNumber: 'SLMC-1',
    };

    expect(accountChange(pharmacist, corrected)).toEqual({
      changes: {
        before: { firstName: 'Kasun', lastName: 'Perera', licenseNumber: null },
        after: {
          firstName: 'Kasun J.',
          lastName: 'Perera-Silva',
          licenseNumber: 'SLMC-1',
        },
      },
      description: 'Admin changed their name and licence number',
    });
  });

  it('describes every change made at once', () => {
    const changed = {
      ...pharmacist,
      isActive: false,
      phone: '0779999999',
      organizationId: 'kandy',
    };

    expect(
      accountChange(pharmacist, changed, { from: 'Colombo', to: 'Kandy' })
        ?.description,
    ).toBe(
      'Admin suspended the account, moved them from Colombo to Kandy and changed their phone',
    );
  });
});
