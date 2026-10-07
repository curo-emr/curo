import type { Stock } from '../entities/stock.entity';

// FEFO (First-Expiry-First-Out): stock leaves the shelf earliest expiry first,
// so the batch closest to expiring is used before it goes to waste.

type Batch = Pick<Stock, 'quantity' | 'expiryDate'>;

/** What one batch gives to a dispense. */
export interface Draw<B extends Batch> {
  batch: B;
  quantity: number;
}

/** FEFO order: earliest expiry first, batches without an expiry date last. */
export function byExpiry(
  a: Pick<Stock, 'expiryDate'>,
  b: Pick<Stock, 'expiryDate'>,
): number {
  return (a.expiryDate ?? '9999-12-31').localeCompare(
    b.expiryDate ?? '9999-12-31',
  );
}

/** A batch can be dispensed from until the end of its expiry date. */
function isUsable(batch: Batch, today: string): boolean {
  return batch.quantity > 0 && (!batch.expiryDate || batch.expiryDate >= today);
}

/**
 * Plans drawing `quantity` units FEFO across `batches`, emptying each usable
 * batch before moving to the next. When the batches hold too few, it draws
 * everything usable and the draws add up to less than `quantity`.
 * `today` is an ISO date (YYYY-MM-DD), like `expiryDate`.
 */
export function planFefoDraws<B extends Batch>(
  batches: B[],
  quantity: number,
  today: string,
): Draw<B>[] {
  const draws: Draw<B>[] = [];
  let remaining = quantity;
  const usable = batches.filter((b) => isUsable(b, today)).sort(byExpiry);
  for (const batch of usable) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    draws.push({ batch, quantity: take });
    remaining -= take;
  }
  return draws;
}
