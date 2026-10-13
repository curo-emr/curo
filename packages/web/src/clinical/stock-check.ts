/** A pharmacy's stock of one drug, as GET /stock/grouped reports it. */
export interface StockOnHand {
  /** Units in batches that haven't expired. */
  usableQuantity: number;
  unit?: string | null;
}

export type StockCheck =
  /** The pharmacy keeps no batches of the drug. */
  | { kind: "unlisted" }
  | { kind: "short" | "enough"; available: number; unit: string };

/**
 * Whether a pharmacy's usable stock of a drug covers `quantity`: the check the
 * pharmacist makes before dispensing and the doctor's hint while prescribing.
 * `drug` is undefined when the pharmacy keeps none; `unit` names the units
 * when its stock doesn't.
 */
export function checkStock(drug: StockOnHand | undefined, quantity: number, unit = ""): StockCheck {
  if (!drug) return { kind: "unlisted" };
  return {
    kind: drug.usableQuantity >= quantity ? "enough" : "short",
    available: drug.usableQuantity,
    unit: drug.unit || unit,
  };
}

/** Whether none of the drug can be dispensed: the pharmacy doesn't stock it, or has none usable. */
export const outOfStock = (check: StockCheck): boolean => check.kind === "unlisted" || check.available <= 0;
