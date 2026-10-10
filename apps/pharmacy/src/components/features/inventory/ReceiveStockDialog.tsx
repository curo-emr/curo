"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PackagePlus } from "lucide-react";
import { apiErrorMessage } from "@curo/web/api";
import { getTodayString } from "@curo/web/format";
import { Button } from "@curo/web/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@curo/web/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@curo/web/ui/field";
import { Input } from "@curo/web/ui/input";
import { SearchCombobox } from "@curo/web/ui/search-combobox";
import { receiveStock, searchCatalog, type CatalogDrug, type GroupedStock } from "@/lib/api/pharmacy";
import { stockQueries } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

/** The form as typed; numbers stay strings until the batch is sent. */
interface Draft {
  drug: CatalogDrug | null;
  batchNumber: string;
  quantity: string;
  unit: string;
  expiryDate: string;
  unitPrice: string;
  supplier: string;
  reorderThreshold: string;
}

const EMPTY: Draft = {
  drug: null, batchNumber: "", quantity: "", unit: "", expiryDate: "", unitPrice: "", supplier: "", reorderThreshold: "",
};

const UNIT_FOR_FORM: Record<string, string> = { tablet: "tablets", capsule: "capsules", inhaler: "inhalers", injection: "vials" };

const isWhole = (value: string, min: number) => /^\d+$/.test(value) && Number(value) >= min;

/** What's wrong with each field, if anything. */
function problemsWith(d: Draft, today: string): Partial<Record<keyof Draft, string>> {
  const problems: Partial<Record<keyof Draft, string>> = {};
  if (!d.drug) problems.drug = "Choose the medicine.";
  if (!d.batchNumber.trim()) problems.batchNumber = "Enter the batch number from the pack.";
  if (!isWhole(d.quantity, 1)) problems.quantity = "Enter a whole number of at least 1.";
  if (!d.unit.trim()) problems.unit = "Enter the unit, e.g. tablets.";
  if (!d.expiryDate) problems.expiryDate = "Enter the expiry date.";
  else if (d.expiryDate < today) problems.expiryDate = "This batch has already expired.";
  if (d.unitPrice === "" || !(Number(d.unitPrice) >= 0)) problems.unitPrice = "Enter the price per unit.";
  if (d.reorderThreshold && !isWhole(d.reorderThreshold, 0)) problems.reorderThreshold = "Enter a whole number.";
  return problems;
}

/**
 * Records a delivered batch of a catalog drug. A drug already on the shelf fills in its unit,
 * last price and reorder level, which the pharmacist can change.
 */
export function ReceiveStockDialog({ drugs }: { drugs: GroupedStock[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const today = getTodayString();
  const problems = problemsWith(draft, today);
  const shown = submitted ? problems : {};

  const close = () => {
    setOpen(false);
    setDraft(EMPTY);
    setSubmitted(false);
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }));

  const choose = (drug: CatalogDrug) => {
    const stocked = drugs.find(d => d.medicationCode === drug.id);
    // Batches come earliest expiry first, so the last is most likely the latest delivery.
    const lastBatch = stocked?.batches.at(-1);
    setDraft(d => ({
      ...d,
      drug,
      unit: stocked?.unit || UNIT_FOR_FORM[drug.form ?? ""] || "",
      unitPrice: lastBatch ? String(Number(lastBatch.unitPrice)) : d.unitPrice,
      reorderThreshold: stocked ? String(stocked.reorderLevel) : d.reorderThreshold,
    }));
  };

  const receive = useMutation({
    mutationFn: (d: Draft & { drug: CatalogDrug }) => receiveStock({
      medicationCode: d.drug.id,
      batchNumber: d.batchNumber.trim(),
      quantity: Number(d.quantity),
      unit: d.unit.trim(),
      expiryDate: d.expiryDate,
      unitPrice: Number(d.unitPrice),
      supplier: d.supplier.trim() || undefined,
      reorderThreshold: d.reorderThreshold ? Number(d.reorderThreshold) : undefined,
    }),
    onSuccess: (_, d) => {
      toast.success(`Received ${d.quantity} ${d.unit} of ${d.drug.name}`, {
        description: `Batch ${d.batchNumber.trim()}, expires ${formatDate(d.expiryDate)}`,
      });
      close();
      return queryClient.invalidateQueries({ queryKey: stockQueries.all });
    },
  });

  const submit = () => {
    setSubmitted(true);
    if (draft.drug && Object.keys(problems).length === 0) receive.mutate({ ...draft, drug: draft.drug });
  };

  const onOpenChange = (next: boolean) => {
    if (next) return setOpen(true);
    close();
    receive.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><PackagePlus />Receive stock</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={e => { e.preventDefault(); submit(); }} className="space-y-5" noValidate>
          <DialogHeader>
            <DialogTitle>Receive stock</DialogTitle>
            <DialogDescription>Record a delivered batch. It can be dispensed as soon as it&apos;s saved.</DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Field data-invalid={!!shown.drug}>
              <FieldLabel htmlFor="receive-drug">Medicine</FieldLabel>
              <SearchCombobox<CatalogDrug>
                id="receive-drug"
                placeholder="Search the medicine list…"
                search={searchCatalog}
                getKey={d => d.id}
                onSelect={choose}
                selected={draft.drug?.name}
                renderItem={d => (
                  <div className="flex w-full items-center justify-between gap-3">
                    <span>{d.name}</span>
                    <span className="shrink-0 text-xs capitalize text-muted-foreground">{d.form}</span>
                  </div>
                )}
              />
              <FieldError>{shown.drug}</FieldError>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="receive-batch" label="Batch number" value={draft.batchNumber} error={shown.batchNumber}
                onChange={v => set("batchNumber", v)} />
              <TextField id="receive-expiry" label="Expiry date" type="date" min={today} value={draft.expiryDate}
                error={shown.expiryDate} onChange={v => set("expiryDate", v)} />
              <TextField id="receive-quantity" label="Quantity" type="number" min="1" step="1" inputMode="numeric"
                value={draft.quantity} error={shown.quantity} onChange={v => set("quantity", v)} />
              <TextField id="receive-unit" label="Unit" placeholder="e.g. tablets" value={draft.unit} error={shown.unit}
                onChange={v => set("unit", v)} />
              <TextField id="receive-price" label="Price per unit (Rs.)" type="number" min="0" step="0.01" inputMode="decimal"
                value={draft.unitPrice} error={shown.unitPrice} onChange={v => set("unitPrice", v)} />
              <TextField id="receive-reorder" label="Reorder at (optional)" type="number" min="0" step="1" inputMode="numeric"
                value={draft.reorderThreshold} error={shown.reorderThreshold} onChange={v => set("reorderThreshold", v)} />
            </div>
            <TextField id="receive-supplier" label="Supplier (optional)" value={draft.supplier} onChange={v => set("supplier", v)} />
          </FieldGroup>

          {receive.isError && (
            <p className="text-sm text-status-error-text">{apiErrorMessage(receive.error, "The stock couldn't be received.")}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={receive.isPending}>Cancel</Button>
            <Button type="submit" disabled={receive.isPending}>
              {receive.isPending && <Loader2 className="animate-spin" />}
              Receive
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TextFieldProps extends Omit<React.ComponentProps<typeof Input>, "onChange"> {
  id: string;
  label: string;
  error?: string;
  onChange: (value: string) => void;
}

function TextField({ id, label, error, onChange, ...input }: TextFieldProps) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} aria-invalid={!!error} onChange={e => onChange(e.target.value)} {...input} />
      <FieldError>{error}</FieldError>
    </Field>
  );
}
