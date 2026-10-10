import type { GroupedStock, StockBatch } from "@/lib/api/pharmacy";
import type { PrescriptionItem } from "@/types";

/** A batch counts as expiring this many days before its expiry date. */
export const EXPIRY_WARNING_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days until `date`; negative once it has passed. */
export const daysUntil = (date: string, now = Date.now()) => Math.floor((new Date(date).getTime() - now) / DAY_MS);

export type ExpiryState = "expired" | "expiring" | "ok";

export function expiryState(date: string | null | undefined, now = Date.now()): ExpiryState {
  if (!date) return "ok";
  const days = daysUntil(date, now);
  if (days < 0) return "expired";
  return days <= EXPIRY_WARNING_DAYS ? "expiring" : "ok";
}

/** A drug's level as a status badge reads it. */
export function stockLevel(drug: GroupedStock): "out_of_stock" | "low_stock" | "in_stock" {
  if (drug.usableQuantity <= 0) return "out_of_stock";
  return drug.low ? "low_stock" : "in_stock";
}

export interface BatchToCheck {
  drug: GroupedStock;
  batch: StockBatch;
  state: Exclude<ExpiryState, "ok">;
}

/** Batches still on the shelf that have expired or expire soon, soonest first. */
export function batchesToCheck(drugs: GroupedStock[]): BatchToCheck[] {
  return drugs
    .flatMap(drug => drug.batches.map(batch => ({ drug, batch, state: expiryState(batch.expiryDate) })))
    .filter((b): b is BatchToCheck => b.batch.quantity > 0 && b.state !== "ok")
    .sort((a, b) => a.batch.expiryDate.localeCompare(b.batch.expiryDate));
}

/** How much of its reorder level a drug has left; the lowest is the most urgent. */
const reorderShare = (drug: GroupedStock) => (drug.reorderLevel ? drug.usableQuantity / drug.reorderLevel : 0);

export const byUrgency = (drugs: GroupedStock[]) => [...drugs].sort((a, b) => reorderShare(a) - reorderShare(b));

export type StockCheck =
  /** This pharmacy keeps no batches of the prescribed medication. */
  | { kind: "unlisted" }
  | { kind: "short" | "enough"; available: number; unit: string };

/** Whether this pharmacy's usable stock covers a prescription item, matched by medication code as dispensing does. */
export function checkStock(item: PrescriptionItem, drugs: GroupedStock[]): StockCheck {
  const drug = drugs.find(d => d.medicationCode === item.medicationId);
  if (!drug) return { kind: "unlisted" };
  return {
    kind: drug.usableQuantity >= item.quantity ? "enough" : "short",
    available: drug.usableQuantity,
    unit: drug.unit || item.quantityUnit,
  };
}
