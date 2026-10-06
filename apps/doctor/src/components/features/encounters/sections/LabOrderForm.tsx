"use client";

import { useCallback, useMemo } from "react";
import { FlaskConical, X } from "lucide-react";
import type { LabTestCatalogItem } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/SectionCard";
import { SearchCombobox } from "@/components/ui/SearchCombobox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { LabPriority, LabTestDraft } from "../visit";

interface LabOrderFormProps {
  tests: LabTestDraft[];
  onTestsChange: (tests: LabTestDraft[]) => void;
  priority: LabPriority;
  onPriorityChange: (priority: LabPriority) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  catalog: LabTestCatalogItem[];
}

export function LabOrderForm({ tests, onTestsChange, priority, onPriorityChange, notes, onNotesChange, catalog }: LabOrderFormProps) {
  // The catalog lists each test once per lab; one entry per code is enough to order it.
  const uniqueCatalog = useMemo(() => [...new Map(catalog.map(t => [t.code, t])).values()], [catalog]);

  const search = useCallback(
    (q: string) => {
      const needle = q.toLowerCase();
      return uniqueCatalog.filter(t => `${t.name} ${t.code} ${t.category}`.toLowerCase().includes(needle)).slice(0, 8);
    },
    [uniqueCatalog],
  );

  const add = (code: string, name: string) => {
    if (tests.some(t => t.code === code)) return;
    onTestsChange([...tests, { code, name }]);
  };

  return (
    <SectionCard id="labs" icon={FlaskConical} iconClassName="text-clinical-lab" title="Lab orders" count={tests.length}
      description="Sent to the lab when you sign the visit">
      <div className="space-y-3">
        <SearchCombobox<LabTestCatalogItem>
          placeholder="Add a lab test…"
          search={search}
          suggestions={uniqueCatalog.slice(0, 6)}
          getKey={t => t.code}
          onSelect={t => add(t.code, t.name)}
          onCustom={name => add(`custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name)}
          renderItem={t => (
            <div className="flex w-full items-center justify-between gap-3">
              <span>{t.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{t.category}</span>
            </div>
          )}
        />
        {tests.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              {tests.map(t => (
                <span key={t.code} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 py-1 pl-3 pr-1.5 text-sm text-foreground">
                  {t.name}
                  <button type="button" onClick={() => onTestsChange(tests.filter(x => x.code !== t.code))}
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-destructive" aria-label={`Remove ${t.name}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <ToggleGroup type="single" variant="outline" size="sm" value={priority}
                  onValueChange={v => v && onPriorityChange(v as LabPriority)}>
                  <ToggleGroupItem value="routine" className="px-3">Routine</ToggleGroupItem>
                  <ToggleGroupItem value="urgent" className="px-3">Urgent</ToggleGroupItem>
                  <ToggleGroupItem value="stat" className="px-3">STAT</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-1">
                <Label htmlFor="lab-notes" className="text-xs text-muted-foreground">Note to the lab</Label>
                <Input id="lab-notes" value={notes} onChange={e => onNotesChange(e.target.value)} placeholder="e.g. Fasting sample" className="h-9" />
              </div>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
