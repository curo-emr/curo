"use client";

import { useCallback, useMemo } from "react";
import { FlaskConical, X } from "lucide-react";
import type { Lab, LabTestCatalogItem } from "@/types";
import { Input } from "@curo/web/ui/input";
import { Label } from "@curo/web/ui/label";
import { SectionCard } from "@curo/web/ui/section-card";
import { SearchCombobox } from "@curo/web/ui/search-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@curo/web/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@curo/web/ui/toggle-group";
import type { LabPriority, LabTestDraft } from "../visit";

interface LabOrderFormProps {
  tests: LabTestDraft[];
  onTestsChange: (tests: LabTestDraft[]) => void;
  priority: LabPriority;
  onPriorityChange: (priority: LabPriority) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  catalog: LabTestCatalogItem[];
  labs: Lab[];
}

export function LabOrderForm({ tests, onTestsChange, priority, onPriorityChange, notes, onNotesChange, catalog, labs }: LabOrderFormProps) {
  // The catalog lists each test once per lab; one entry per code is enough to order it.
  const uniqueCatalog = useMemo(() => [...new Map(catalog.map(t => [t.code, t])).values()], [catalog]);

  // The labs to offer for a test: those whose catalog has it, or every lab for a test none lists.
  const labsFor = useCallback(
    (code: string) => {
      const offering = new Set(catalog.filter(t => t.code === code).map(t => t.labId));
      const offered = labs.filter(l => offering.has(l.id));
      return offered.length ? offered : labs;
    },
    [catalog, labs],
  );

  const search = useCallback(
    (q: string) => {
      const needle = q.toLowerCase();
      return uniqueCatalog.filter(t => `${t.name} ${t.code} ${t.category}`.toLowerCase().includes(needle)).slice(0, 8);
    },
    [uniqueCatalog],
  );

  // A new test goes to the first lab that offers it; the doctor can change that.
  const add = (code: string, name: string) => {
    if (tests.some(t => t.code === code)) return;
    onTestsChange([...tests, { code, name, labId: labsFor(code)[0]?.id }]);
  };

  const sendTo = (code: string, labId: string) =>
    onTestsChange(tests.map(t => (t.code === code ? { ...t, labId } : t)));

  const description =
    labs.length === 1 ? `Sent to ${labs[0].name} when you sign the visit`
      : "Each test goes to the lab you choose when you sign the visit";

  if (labs.length === 0)
    return (
      <SectionCard id="labs" icon={FlaskConical} iconClassName="text-clinical-lab" title="Lab orders">
        <p className="text-sm text-muted-foreground">No laboratory is set up yet, so tests can&apos;t be ordered. Ask an administrator to add one.</p>
      </SectionCard>
    );

  return (
    <SectionCard id="labs" icon={FlaskConical} iconClassName="text-clinical-lab" title="Lab orders" count={tests.length}
      description={description}>
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
            <ul className="divide-y rounded-lg border">
              {tests.map(t => (
                <li key={t.code} className="flex flex-wrap items-center gap-2 py-1.5 pl-3 pr-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{t.name}</span>
                  {(labs.length > 1 || !t.labId) && (
                    <Select value={t.labId ?? ""} onValueChange={labId => sendTo(t.code, labId)}>
                      <SelectTrigger size="sm" aria-label={`Lab for ${t.name}`} aria-invalid={!t.labId}
                        className="max-w-full bg-card text-xs sm:w-60">
                        <SelectValue placeholder="Choose a lab" />
                      </SelectTrigger>
                      <SelectContent>
                        {labsFor(t.code).map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <button type="button" onClick={() => onTestsChange(tests.filter(x => x.code !== t.code))}
                    className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label={`Remove ${t.name}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
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
