"use client";

import Link from "next/link";
import { ClipboardList, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { Skeleton } from "@curo/web/ui/skeleton";
import { SectionCard } from "@curo/web/ui/section-card";
import { ROUTES } from "@/lib/constants";
import { recentMedicationNames, uniqueActiveProblems } from "@/lib/clinical";
import { patientQueries } from "@/lib/queries";

// Loading and error states sized for this narrow card.
const compact = (what: string) => ({
  loading: <Skeleton className="h-4 w-2/3" />,
  error: <p className="text-status-warning-text">Couldn&apos;t load {what}.</p>,
});

// What the doctor needs to glance at while documenting, without leaving the visit.
export function PatientContext({ patientId }: { patientId: string }) {
  const problems = useQuery(patientQueries.conditions(patientId));
  const prescriptions = useQuery(patientQueries.prescriptions(patientId));

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
          <QueryContent query={problems} what="problems" {...compact("problems")}>
            {list => {
              const active = uniqueActiveProblems(list);
              return active.length === 0 ? (
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
              );
            }}
          </QueryContent>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Recent medications</p>
          <QueryContent query={prescriptions} what="medications" {...compact("medications")}>
            {list => {
              const names = recentMedicationNames(list);
              return names.length === 0 ? (
                <p className="text-muted-foreground">None in the last 90 days</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {names.map(m => (
                    <li key={m} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">{m}</li>
                  ))}
                </ul>
              );
            }}
          </QueryContent>
        </div>
      </div>
    </SectionCard>
  );
}

