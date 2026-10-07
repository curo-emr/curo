import Link from "next/link";
import { ClipboardList, ExternalLink } from "lucide-react";
import type { Problem } from "@/types";
import { SectionCard } from "@curo/web/ui/section-card";
import { ROUTES } from "@/lib/constants";
import { uniqueActiveProblems } from "@/lib/clinical";

interface Props {
  patientId: string;
  problems: Problem[];
  recentMedications: string[];
}

// What the doctor needs to glance at while documenting, without leaving the visit.
export function PatientContext({ patientId, problems, recentMedications }: Props) {
  const active = uniqueActiveProblems(problems);

  return (
    <SectionCard
      icon={ClipboardList}
      title="Patient history"
      headerRight={
        <Link href={ROUTES.PATIENT(patientId)} target="_blank" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Full chart <ExternalLink className="h-3 w-3" />
        </Link>
      }
    >
      <div className="space-y-4 text-sm">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Active problems</p>
          {active.length === 0 ? (
            <p className="text-muted-foreground">None recorded</p>
          ) : (
            <ul className="space-y-1">
              {active.map(p => (
                <li key={p.id} className="flex items-baseline justify-between gap-2">
                  <span className="text-foreground">{p.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{p.icdCode}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Recent medications</p>
          {recentMedications.length === 0 ? (
            <p className="text-muted-foreground">None in the last 90 days</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {recentMedications.map(m => (
                <li key={m} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">{m}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
