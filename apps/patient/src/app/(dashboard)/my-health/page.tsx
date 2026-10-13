"use client";

import { useQuery } from "@tanstack/react-query";
import { HeartPulse, History, ShieldAlert, ShieldCheck } from "lucide-react";
import { formatAllergySeverity, type AllergySeverity } from "@curo/web/fhir";
import { QueryContent, allOf } from "@curo/web/query";
import { Badge } from "@curo/web/ui/badge";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { toneClass, type Tone } from "@curo/web/ui/status-badge";
import { MyRecord } from "@/components/features/MyRecord";
import { RECEPTION } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { myQueries } from "@/lib/queries";
import type { Allergy, Condition } from "@/types";

export default function MyHealthPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="My health" description="The allergies and conditions your clinic has on record for you." />
      <MyRecord>{patient => <MyHealth patientId={patient.id} />}</MyRecord>
    </div>
  );
}

function MyHealth({ patientId }: { patientId: string }) {
  // Loaded together: an empty list must never stand in for one that failed, such as "no known allergies".
  const record = allOf(useQuery(myQueries.allergies(patientId)), useQuery(myQueries.conditions(patientId)));
  return (
    <QueryContent query={record} what="your health record">
      {([allergies, conditions]) => (
        <>
          <Allergies allergies={allergies} />
          <Conditions conditions={conditions} />
          <p className="text-sm text-muted-foreground">
            Something missing or wrong? Tell your doctor at your next visit, or contact {RECEPTION}.
          </p>
        </>
      )}
    </QueryContent>
  );
}

const SEVERITY_TONE: Record<AllergySeverity, Tone> = { mild: "info", moderate: "warning", severe: "error", unknown: "warning" };

function Allergies({ allergies }: { allergies: Allergy[] }) {
  return (
    <SectionCard icon={ShieldAlert} iconClassName="text-status-error-text" title="Allergies" count={allergies.length} noPadding>
      {allergies.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No known allergies" description="Your clinic has no allergies on record for you." />
      ) : (
        <ul className="divide-y">
          {allergies.map(a => (
            <li key={a.id} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{a.substance}</p>
                {a.reaction && <p className="text-sm text-muted-foreground">Reaction: {a.reaction}</p>}
                {a.notes && <p className="mt-1 text-sm text-muted-foreground">{a.notes}</p>}
              </div>
              <Badge variant="outline" className={`shrink-0 ${toneClass(SEVERITY_TONE[a.severity])}`}>{formatAllergySeverity(a.severity)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function Conditions({ conditions }: { conditions: Condition[] }) {
  const current = conditions.filter(c => c.status === "active");
  const past = conditions.filter(c => c.status !== "active");

  return (
    <>
      <SectionCard icon={HeartPulse} iconClassName="text-status-warning-text" title="Conditions" count={current.length} noPadding>
        {current.length === 0
          ? <EmptyState icon={HeartPulse} title="No ongoing conditions on record" />
          : <ConditionList conditions={current} />}
      </SectionCard>
      {past.length > 0 && (
        <SectionCard icon={History} iconClassName="text-muted-foreground" title="Past conditions" count={past.length} noPadding>
          <ConditionList conditions={past} />
        </SectionCard>
      )}
    </>
  );
}

function ConditionList({ conditions }: { conditions: Condition[] }) {
  return (
    <ul className="divide-y">
      {conditions.map(c => (
        <li key={c.id} className="p-4">
          <p className="font-medium text-foreground">{c.name}</p>
          {c.since && <p className="text-sm text-muted-foreground">On record since {formatDate(c.since)}</p>}
        </li>
      ))}
    </ul>
  );
}
