"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Pill, X } from "lucide-react";
import type { Medication, PrescriptionItem } from "@/types";
import type { Organization as Pharmacy, PharmacyStockItem } from "@/lib/api/directory";
import { allergyAlerts, checkStock, describeAllergyAlert, outOfStock, type StockCheck } from "@curo/web/clinical";
import { AllergyConfirmDialog } from "@curo/web/ui/allergy-confirm-dialog";
import { Button } from "@curo/web/ui/button";
import { Checkbox } from "@curo/web/ui/checkbox";
import { Input } from "@curo/web/ui/input";
import { Label } from "@curo/web/ui/label";
import { SectionCard } from "@curo/web/ui/section-card";
import { SearchCombobox } from "@curo/web/ui/search-combobox";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@curo/web/ui/select";
import { searchMedications } from "@/lib/api/medications";
import { directoryQueries } from "@/lib/queries";
import { usePatientAllergies } from "@/components/features/patients/AllergyChips";
import { FREQUENCIES, routeForForm, suggestQuantity } from "../visit";

interface PrescriptionFormProps {
  prescriptions: PrescriptionItem[];
  onChange: (items: PrescriptionItem[]) => void;
  /** Where the prescriptions are sent; the doctor chooses when there is more than one. Undefined until known. */
  pharmacies: Pharmacy[] | undefined;
  pharmacyId: string | undefined;
  onPharmacyChange: (pharmacyId: string) => void;
  /** Shown before the doctor types; typing searches the whole catalog. */
  suggestions: Medication[];
  patientId: string;
}

// The pharmacy stocks and dispenses catalog drugs by their codes, so one the
// catalog doesn't list (no `id`) can only be bought outside.
const newItem = (med: Pick<Medication, "name"> & Partial<Medication>, boughtOutside: boolean): PrescriptionItem => ({
  id: `rx-${Date.now()}`,
  medicationId: med.id ?? "",
  displayName: med.name,
  dose: med.strength ?? "",
  route: routeForForm(med.form),
  frequency: "BD",
  durationDays: 5,
  quantity: suggestQuantity("BD", 5) ?? 1,
  instructions: "",
  substitutes: [],
  boughtOutside: boughtOutside || !med.id,
});

export function PrescriptionForm({
  prescriptions, onChange, pharmacies, pharmacyId, onPharmacyChange, suggestions, patientId,
}: PrescriptionFormProps) {
  // null when they couldn't be loaded: the allergy check can't run, so the doctor is told.
  const allergies = usePatientAllergies(patientId);
  const alertsFor = (name: string) => allergyAlerts(name, allergies ?? []);
  // A drug the patient may be allergic to waits here until the doctor confirms it.
  const [unconfirmed, setUnconfirmed] = useState<PrescriptionItem | null>(null);
  const add = (item: PrescriptionItem) => {
    if (alertsFor(item.displayName).length > 0) setUnconfirmed(item);
    else onChange([...prescriptions, item]);
  };
  const update = (id: string, patch: Partial<PrescriptionItem>) =>
    onChange(prescriptions.map(p => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch };
      // Keep quantity in step with frequency × days unless the doctor typed one.
      if ("frequency" in patch || "durationDays" in patch) {
        next.quantity = suggestQuantity(next.frequency, next.durationDays) ?? next.quantity;
      }
      return next;
    }));

  // With no pharmacy set up, the patient buys everything outside. Until the
  // pharmacies are known, lines go to the pharmacy, and signing checks there is one.
  const noPharmacy = pharmacies?.length === 0;
  const pharmacyName = pharmacies?.find(p => p.id === pharmacyId)?.name;
  // The chosen pharmacy's stock by drug code. Undefined until it is known, so
  // nothing is hinted or ticked on a guess.
  const stock = useQuery({
    ...directoryQueries.pharmacyStock(pharmacyId ?? ""),
    enabled: !!pharmacyId,
    select: toStockByCode,
  }).data;
  const stockCheck = (medicationId: string, quantity: number) =>
    stock && medicationId ? checkStock(stock.get(medicationId), quantity) : undefined;
  // A drug the pharmacy can't dispense starts as bought outside; the doctor can untick it.
  const startsOutside = (med: Medication) => {
    const check = stockCheck(med.id, 1);
    return noPharmacy || (!!check && outOfStock(check));
  };
  const description = noPharmacy
    ? "No pharmacy is set up yet, so the patient buys these at a pharmacy of their choice"
    : pharmacies?.length === 1
      ? `Sent to ${pharmacies[0].name} when you sign the visit, unless the patient buys them outside`
      : "Sent to the pharmacy you choose when you sign the visit, unless the patient buys them outside";

  return (
    <SectionCard id="prescriptions" icon={Pill} iconClassName="text-clinical-rx" title="Prescriptions" count={prescriptions.length}
      description={description}
      headerRight={pharmacies && pharmacies.length > 1 && (
        <Select value={pharmacyId ?? ""} onValueChange={onPharmacyChange}>
          <SelectTrigger size="sm" aria-label="Pharmacy" className="max-w-48 bg-card text-xs sm:max-w-60">
            <SelectValue placeholder="Choose a pharmacy" />
          </SelectTrigger>
          <SelectContent>
            {pharmacies.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}>
      <div className="space-y-3">
        {allergies === null && (
          <p className="flex items-center gap-2 rounded-md border border-status-warning-border bg-status-warning-bg px-2.5 py-1.5 text-xs font-medium text-status-warning-text">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> The allergy check is off because the patient&apos;s allergies couldn&apos;t be loaded. Confirm allergies with the patient.
          </p>
        )}
        <SearchCombobox<Medication>
          placeholder="Add a medication…"
          search={searchMedications}
          suggestions={suggestions}
          getKey={m => m.id}
          onSelect={m => add(newItem(m, startsOutside(m)))}
          onCustom={name => add(newItem({ name }, true))}
          customLabel={name => (
            <span>Prescribe <span className="font-medium text-foreground">“{name}”</span> as typed — bought outside</span>
          )}
          renderItem={m => {
            const check = stockCheck(m.id, 1);
            return (
              <div className="flex w-full items-center justify-between gap-3">
                <span>{m.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{m.form}</span>
                  {check && (outOfStock(check)
                    ? <span className="font-medium text-status-error-text">Out of stock</span>
                    : <span className="text-status-success-text">In stock</span>)}
                </span>
              </div>
            );
          }}
        />
        {prescriptions.map(rx => {
          const alerts = alertsFor(rx.displayName);
          return (
            <div key={rx.id} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                    {rx.displayName}
                    {rx.boughtOutside && <StatusBadge status="outside_pharmacy" />}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">{rx.route}</p>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(prescriptions.filter(p => p.id !== rx.id))}
                  aria-label={`Remove ${rx.displayName}`} className="text-muted-foreground hover:text-destructive">
                  <X />
                </Button>
              </div>
              {alerts.map(alert => (
                <p key={alert.allergy.id} className="flex items-center gap-2 rounded-md border border-status-error-border bg-status-error-bg px-2.5 py-1.5 text-xs font-medium text-status-error-text">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {describeAllergyAlert(alert, rx.displayName)}
                </p>
              ))}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1.6fr_0.7fr_0.7fr]">
                <Field label="Dose">
                  <Input value={rx.dose} onChange={e => update(rx.id, { dose: e.target.value })} placeholder="e.g. 500mg" className="h-9" />
                </Field>
                <Field label="Frequency">
                  <Select value={rx.frequency} onValueChange={frequency => update(rx.id, { frequency })}>
                    <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Days">
                  <Input type="number" min={1} value={rx.durationDays || ""} onChange={e => update(rx.id, { durationDays: Number(e.target.value) })} className="h-9" />
                </Field>
                <Field label="Quantity">
                  <Input type="number" min={1} value={rx.quantity || ""} onChange={e => update(rx.id, { quantity: Number(e.target.value) })} className="h-9" />
                </Field>
              </div>
              <Field label="Instructions">
                <Input value={rx.instructions} onChange={e => update(rx.id, { instructions: e.target.value })} placeholder="e.g. After meals" className="h-9" />
              </Field>
              <StockHint check={stockCheck(rx.medicationId, rx.quantity)} quantity={rx.quantity} pharmacy={pharmacyName} />
              {/* Only a catalog drug, with a pharmacy to send it to, can go either way. */}
              {rx.medicationId && !noPharmacy && (
                <div className="flex items-center gap-2">
                  <Checkbox id={`${rx.id}-outside`} checked={!!rx.boughtOutside} onCheckedChange={checked => update(rx.id, { boughtOutside: checked === true })} />
                  <Label htmlFor={`${rx.id}-outside`} className="text-sm font-normal">Patient buys this outside (not in stock here)</Label>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <AllergyConfirmDialog
        drugName={unconfirmed?.displayName ?? null}
        alerts={unconfirmed ? alertsFor(unconfirmed.displayName) : []}
        confirmLabel="Prescribe anyway"
        onConfirm={() => { if (unconfirmed) onChange([...prescriptions, unconfirmed]); setUnconfirmed(null); }}
        onCancel={() => setUnconfirmed(null)}
      />
    </SectionCard>
  );
}

const toStockByCode = (drugs: PharmacyStockItem[]) => new Map(drugs.map(d => [d.id, d]));

/** What the chosen pharmacy has of a line's drug, against the quantity prescribed. */
function StockHint({ check, quantity, pharmacy = "the pharmacy" }: { check: StockCheck | undefined; quantity: number; pharmacy?: string }) {
  if (!check) return null;
  if (outOfStock(check))
    return <p className="text-xs font-medium text-status-error-text">Out of stock at {pharmacy}</p>;
  if (check.kind === "short")
    return (
      <p className="text-xs font-medium text-status-warning-text">
        Only {[check.available, check.unit].filter(Boolean).join(" ")} at {pharmacy}; {quantity} prescribed
      </p>
    );
  return <p className="text-xs text-status-success-text">In stock at {pharmacy}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
