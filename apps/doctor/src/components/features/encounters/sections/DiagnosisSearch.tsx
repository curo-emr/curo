"use client";

import { useCallback } from "react";
import { Star, Stethoscope, X } from "lucide-react";
import type { Diagnosis, ICD10 } from "@/types";
import { Button } from "@curo/web/ui/button";
import { SectionCard } from "@curo/web/ui/section-card";
import { SearchCombobox } from "@/components/ui/SearchCombobox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@curo/web/ui/tooltip";
import { searchICD10 } from "@/lib/api/icd";
import { cn } from "@/lib/utils";

interface DiagnosisSearchProps {
  diagnoses: Diagnosis[];
  onChange: (diagnoses: Diagnosis[]) => void;
}

export function DiagnosisSearch({ diagnoses, onChange }: DiagnosisSearchProps) {
  const search = useCallback((q: string) => searchICD10(q, 8), []);

  const add = (icd: ICD10) => {
    if (diagnoses.some(d => d.icdCode === icd.code)) return;
    onChange([...diagnoses, { icdCode: icd.code, name: icd.name, isPrimary: diagnoses.length === 0 }]);
  };

  const makePrimary = (code: string) => onChange(diagnoses.map(d => ({ ...d, isPrimary: d.icdCode === code })));

  const remove = (code: string) => {
    const rest = diagnoses.filter(d => d.icdCode !== code);
    // Keep exactly one primary while any diagnosis remains.
    if (rest.length > 0 && !rest.some(d => d.isPrimary)) rest[0] = { ...rest[0], isPrimary: true };
    onChange(rest);
  };

  return (
    <SectionCard id="diagnoses" icon={Stethoscope} iconClassName="text-clinical-diagnosis" title="Diagnoses" count={diagnoses.length}>
      <div className="space-y-3">
        <SearchCombobox<ICD10>
          placeholder="Search ICD-10 by condition or code…"
          search={search}
          getKey={icd => icd.code}
          onSelect={add}
          renderItem={icd => (
            <div className="flex w-full items-center justify-between gap-3">
              <span>{icd.name}</span>
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{icd.code}</span>
            </div>
          )}
        />
        {diagnoses.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {diagnoses.map(d => (
              <li key={d.icdCode} className="flex items-center gap-3 px-3 py-2.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => makePrimary(d.icdCode)}
                      aria-label={d.isPrimary ? "Primary diagnosis" : "Make primary"}
                      className={cn("rounded p-1 transition-colors", d.isPrimary ? "text-status-warning-text" : "text-muted-foreground/40 hover:text-status-warning-text")}
                    >
                      <Star className={cn("h-4 w-4", d.isPrimary && "fill-current")} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{d.isPrimary ? "Primary diagnosis" : "Make primary"}</TooltipContent>
                </Tooltip>
                <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{d.icdCode}</span>
                <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{d.name}</span>
                {d.isPrimary && <span className="hidden sm:inline text-xs font-medium text-status-warning-text">Primary</span>}
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(d.icdCode)} aria-label={`Remove ${d.name}`} className="text-muted-foreground hover:text-destructive">
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
