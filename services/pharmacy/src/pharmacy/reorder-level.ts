import type { Stock } from '../entities/stock.entity';
import { isUsable } from './fefo';

// Stock is reordered per drug, not per batch: a drug is low when the units
// left across all its usable batches are at or below its reorder level. This
// file is the one definition of "low", for alerts and every stock view.

type Batch = Pick<Stock, 'quantity' | 'expiryDate' | 'reorderThreshold'>;

/** A drug's stock, measured against the level it is reordered at. */
export interface StockLevel {
  /** Units in batches that can still be dispensed; expired ones don't count. */
  usableQuantity: number;
  /** The highest level any batch sets, so a disagreeing batch errs early. */
  reorderLevel: number;
}

/** The stock level of one drug, from all of its active batches. */
export function stockLevel(batches: Batch[], today: string): StockLevel {
  return {
    usableQuantity: batches
      .filter((b) => isUsable(b, today))
      .reduce((sum, b) => sum + b.quantity, 0),
    reorderLevel: Math.max(0, ...batches.map((b) => b.reorderThreshold)),
  };
}

export function isLow({ usableQuantity, reorderLevel }: StockLevel): boolean {
  return usableQuantity <= reorderLevel;
}

/**
 * The drug's stock level after drawing `drawn` units from `batches` (all of
 * the drug's active batches, before the draw), when that draw is the one that
 * makes it low; otherwise null, so a drug already low doesn't alert again on
 * every dispense.
 */
export function lowStockAfterDraw(
  batches: Batch[],
  drawn: number,
  today: string,
): StockLevel | null {
  const before = stockLevel(batches, today);
  const after = { ...before, usableQuantity: before.usableQuantity - drawn };
  return !isLow(before) && isLow(after) ? after : null;
}
