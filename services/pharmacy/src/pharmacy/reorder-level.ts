import type { Stock } from '../entities/stock.entity';
import { isUsable } from './fefo';

// Stock is reordered per drug, not per batch: a drug runs low when the units
// left across all its usable batches fall to its reorder level.

type Batch = Pick<Stock, 'quantity' | 'expiryDate' | 'reorderThreshold'>;

/** A drug that a dispense has just taken to its reorder level or below. */
export interface LowStock {
  remaining: number;
  reorderLevel: number;
}

/**
 * The drug's stock after drawing `drawn` units from `batches` (all of the
 * drug's active batches, before the draw), when that draw is the one that
 * takes it to its reorder level or below; otherwise null, so a drug already
 * low doesn't alert again on every dispense. Expired batches don't count. The
 * level is the highest any batch sets, so a disagreeing batch errs early.
 */
export function lowStockAfterDraw(
  batches: Batch[],
  drawn: number,
  today: string,
): LowStock | null {
  if (!batches.length) return null;
  const before = batches
    .filter((b) => isUsable(b, today))
    .reduce((sum, b) => sum + b.quantity, 0);
  const reorderLevel = Math.max(...batches.map((b) => b.reorderThreshold));
  const remaining = before - drawn;
  return before > reorderLevel && remaining <= reorderLevel
    ? { remaining, reorderLevel }
    : null;
}
