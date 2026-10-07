import { byExpiry, planFefoDraws } from './fefo';

const TODAY = '2026-10-07';

const batch = (id: string, quantity: number, expiryDate: string | null) => ({
  id,
  quantity,
  expiryDate: expiryDate as string,
});

/** The plan as [batch id, units drawn] pairs. */
const plan = (batches: ReturnType<typeof batch>[], quantity: number) =>
  planFefoDraws(batches, quantity, TODAY).map((d) => [d.batch.id, d.quantity]);

describe('planFefoDraws', () => {
  it('draws from the batch that expires first, whatever order the batches come in', () => {
    const batches = [
      batch('late', 50, '2027-06-30'),
      batch('soon', 50, '2026-12-31'),
    ];

    expect(plan(batches, 10)).toEqual([['soon', 10]]);
  });

  it('empties a batch before moving on to the next', () => {
    const batches = [
      batch('third', 50, '2027-06-30'),
      batch('first', 4, '2026-11-01'),
      batch('second', 3, '2026-12-01'),
    ];

    expect(plan(batches, 10)).toEqual([
      ['first', 4],
      ['second', 3],
      ['third', 3],
    ]);
  });

  it('skips expired batches but still uses a batch on its expiry date', () => {
    const batches = [
      batch('expired', 50, '2026-10-06'),
      batch('expires-today', 2, TODAY),
      batch('later', 50, '2027-01-01'),
    ];

    expect(plan(batches, 5)).toEqual([
      ['expires-today', 2],
      ['later', 3],
    ]);
  });

  it('uses batches without an expiry date last', () => {
    const batches = [
      batch('no-expiry', 50, null),
      batch('dated', 2, '2027-01-01'),
    ];

    expect(plan(batches, 5)).toEqual([
      ['dated', 2],
      ['no-expiry', 3],
    ]);
  });

  it('skips empty batches', () => {
    const batches = [
      batch('empty', 0, '2026-11-01'),
      batch('stocked', 9, '2027-01-01'),
    ];

    expect(plan(batches, 5)).toEqual([['stocked', 5]]);
  });

  it('draws everything usable when stock falls short', () => {
    const batches = [
      batch('a', 2, '2026-11-01'),
      batch('expired', 50, '2026-01-01'),
      batch('b', 3, '2027-01-01'),
    ];

    expect(plan(batches, 10)).toEqual([
      ['a', 2],
      ['b', 3],
    ]);
  });

  it('only plans: the batches and their order are left as they were', () => {
    const batches = [batch('late', 5, '2027-06-30'), batch('soon', 5, TODAY)];

    plan(batches, 7);

    expect(batches).toEqual([
      batch('late', 5, '2027-06-30'),
      batch('soon', 5, TODAY),
    ]);
  });
});

describe('byExpiry', () => {
  it('orders batches earliest expiry first, undated last', () => {
    const batches = [
      batch('undated', 1, null),
      batch('late', 1, '2027-06-30'),
      batch('soon', 1, '2026-11-01'),
    ];

    expect(batches.sort(byExpiry).map((b) => b.id)).toEqual([
      'soon',
      'late',
      'undated',
    ]);
  });
});
