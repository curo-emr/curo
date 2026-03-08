"use client";

import { SOAP } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileSignature } from "lucide-react";

const SOAP_SECTIONS = [
  { key: 'subjective' as const, label: 'S — Subjective', placeholder: 'History of Present Illness (HPI), chief complaint, review of systems, symptoms reported by patient...' },
  { key: 'objective' as const, label: 'O — Objective', placeholder: 'Physical exam findings, vital sign observations, relevant test results observed...' },
  { key: 'assessment' as const, label: 'A — Assessment', placeholder: 'Clinical impressions, working diagnosis, differential diagnoses...' },
  { key: 'plan' as const, label: 'P — Plan', placeholder: 'Treatment plan, medications ordered, lab orders, referrals, patient instructions, follow-up...' },
];

interface ClinicalNotesProps {
  chiefComplaint: string;
  setChiefComplaint: (value: string) => void;
  soap: SOAP;
  setSoap: React.Dispatch<React.SetStateAction<SOAP>>;
}

export function ClinicalNotes({ chiefComplaint, setChiefComplaint, soap, setSoap }: ClinicalNotesProps) {
  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted border-b pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" /> Clinical Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        <div>
          <Label htmlFor="cc" className="font-semibold text-foreground">Chief Complaint</Label>
          <Input id="cc" value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} placeholder="e.g. Chest pain for 2 days" className="mt-1" />
        </div>

        {/* SOAP — stacked sections, all visible at once */}
        <div className="space-y-5 mt-2 pt-2 border-t">
          {SOAP_SECTIONS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label className="font-semibold text-foreground text-sm tracking-wide">{label}</Label>
              <Textarea
                placeholder={placeholder}
                className="mt-1.5 min-h-[120px] resize-y text-sm"
                value={soap[key]}
                onChange={e => setSoap(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
