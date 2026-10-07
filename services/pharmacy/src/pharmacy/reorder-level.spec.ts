import { lowStockAfterDraw } from './reorder-level';

const TODAY = '2026-10-07';

const batch = (
  quantity: number,
  reorderThreshold = 10,
  expiryDate: string | null = '2027-06-30',
) => ({ quantity, reorderThreshold, expiryDate: expiryDate as string });

describe('lowStockAfterDraw', () => {
  it('reports the draw that takes the drug to its reorder level', () => {
    expect(lowStockAfterDraw([batch(15)], 5, TODAY)).toEqual({
      remaining: 10,
      reorderLevel: 10,
    });
  });

  it('reports nothing while the drug stays above its level', () => {
    expect(lowStockAfterDraw([batch(15)], 4, TODAY)).toBeNull();
  });

  it('reports nothing when the drug was already at or below its level', () => {
    expect(lowStockAfterDraw([batch(10)], 3, TODAY)).toBeNull();
    expect(lowStockAfterDraw([batch(4)], 1, TODAY)).toBeNull();
  });

  it('counts every batch: the total crosses although no batch does', () => {
    expect(lowStockAfterDraw([batch(8), batch(8)], 7, TODAY)).toEqual({
      remaining: 9,
      reorderLevel: 10,
    });
  });

  it('leaves expired batches out of what is left', () => {
    const batches = [batch(12), batch(100, 10, '2026-10-06')];

    expect(lowStockAfterDraw(batches, 3, TODAY)).toEqual({
      remaining: 9,
      reorderLevel: 10,
    });
  });

  it('uses the highest reorder level when batches disagree', () => {
    expect(lowStockAfterDraw([batch(15, 10), batch(15, 25)], 6, TODAY)).toEqual(
      { remaining: 24, reorderLevel: 25 },
    );
  });

  it('reports nothing for a drug with no batches', () => {
    expect(lowStockAfterDraw([], 1, TODAY)).toBeNull();
  });
});
