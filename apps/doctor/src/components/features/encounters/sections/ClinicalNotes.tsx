"use client";

import { forwardRef } from "react";
import { NotebookPen } from "lucide-react";
import type { SOAP } from "@/types";
import { Input } from "@curo/web/ui/input";
import { Textarea } from "@curo/web/ui/textarea";
import { Label } from "@curo/web/ui/label";
import { SectionCard } from "@curo/web/ui/section-card";

const SOAP_SECTIONS = [
  { key: "subjective" as const, label: "Subjective", hint: "History, symptoms as the patient describes them" },
  { key: "objective" as const, label: "Objective", hint: "Examination findings, observations" },
  { key: "assessment" as const, label: "Assessment", hint: "Clinical impression, differentials" },
  { key: "plan" as const, label: "Plan", hint: "Treatment, advice, follow-up" },
];

interface ClinicalNotesProps {
  chiefComplaint: string;
  onChiefComplaintChange: (value: string) => void;
  soap: SOAP;
  onSoapChange: (soap: SOAP) => void;
  invalid?: boolean;
}

export const ClinicalNotes = forwardRef<HTMLInputElement, ClinicalNotesProps>(function ClinicalNotes(
  { chiefComplaint, onChiefComplaintChange, soap, onSoapChange, invalid },
  ref,
) {
  return (
    <SectionCard id="notes" icon={NotebookPen} iconClassName="text-clinical-notes" title="Consultation notes">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="cc">
            Chief complaint <span className="text-destructive">*</span>
          </Label>
          <Input
            ref={ref}
            id="cc"
            value={chiefComplaint}
            onChange={e => onChiefComplaintChange(e.target.value)}
            placeholder="Why is the patient here today? e.g. Chest pain for 2 days"
            aria-invalid={invalid || undefined}
            className="h-10 scroll-mt-56 text-base md:text-sm"
          />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {SOAP_SECTIONS.map(({ key, label, hint }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`soap-${key}`} className="flex items-baseline gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[11px] font-bold text-muted-foreground">{label[0]}</span>
                {label}
              </Label>
              <Textarea
                id={`soap-${key}`}
                placeholder={hint}
                className="min-h-24 resize-none"
                value={soap[key]}
                onChange={e => onSoapChange({ ...soap, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
});
