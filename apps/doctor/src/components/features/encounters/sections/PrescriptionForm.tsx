"use client";

import { AlertTriangle, Pill, X } from "lucide-react";
import type { Allergy, Medication, PrescriptionItem } from "@/types";
import { Button } from "@curo/web/ui/button";
import { Input } from "@curo/web/ui/input";
import { Label } from "@curo/web/ui/label";
import { SectionCard } from "@curo/web/ui/section-card";
import { SearchCombobox } from "@/components/ui/SearchCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@curo/web/ui/select";
import { searchMedications } from "@/lib/api/medications";
import { FREQUENCIES, routeForForm, suggestQuantity } from "../visit";

interface PrescriptionFormProps {
  prescriptions: PrescriptionItem[];
  onChange: (items: PrescriptionItem[]) => void;
  /** Shown before the doctor types; typing searches the whole catalog. */
  suggestions: Medication[];
  /** null when they couldn't be loaded: the allergy check can't run, so the doctor is told. */
  allergies: Allergy[] | null;
}

const newItem = (displayName: string, med?: Medication): PrescriptionItem => ({
  id: `rx-${Date.now()}`,
  medicationId: med?.id ?? `custom-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  displayName,
  dose: med?.strength ?? "",
  route: routeForForm(med?.form),
  frequency: "BD",
  durationDays: 5,
  quantity: suggestQuantity("BD", 5) ?? 1,
  instructions: "",
  substitutes: [],
});

// Allergy whose substance appears in the drug name, e.g. "Penicillin" in "Penicillin V 250mg".
const allergyConflict = (name: string, allergies: Allergy[] | null) =>
  allergies?.find(a => a.substance && name.toLowerCase().includes(a.substance.toLowerCase()));

export function PrescriptionForm({ prescriptions, onChange, suggestions, allergies }: PrescriptionFormProps) {
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

  return (
    <SectionCard id="prescriptions" icon={Pill} iconClassName="text-clinical-rx" title="Prescriptions" count={prescriptions.length}
      description="Sent to the pharmacy when you sign the visit">
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
          onSelect={m => onChange([...prescriptions, newItem(m.name, m)])}
          onCustom={name => onChange([...prescriptions, newItem(name)])}
          renderItem={m => (
            <div className="flex w-full items-center justify-between gap-3">
              <span>{m.name}</span>
              <span className="shrink-0 text-xs capitalize text-muted-foreground">{m.form}</span>
            </div>
          )}
        />
        {prescriptions.map(rx => {
          const conflict = allergyConflict(rx.displayName, allergies);
          return (
            <div key={rx.id} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{rx.displayName}</p>
                  <p className="text-xs capitalize text-muted-foreground">{rx.route}</p>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(prescriptions.filter(p => p.id !== rx.id))}
                  aria-label={`Remove ${rx.displayName}`} className="text-muted-foreground hover:text-destructive">
                  <X />
                </Button>
              </div>
              {conflict && (
                <p className="flex items-center gap-2 rounded-md border border-status-error-border bg-status-error-bg px-2.5 py-1.5 text-xs font-medium text-status-error-text">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Patient is allergic to {conflict.substance}
                  {conflict.reaction ? ` (${conflict.reaction})` : ""}.
                </p>
              )}
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
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
