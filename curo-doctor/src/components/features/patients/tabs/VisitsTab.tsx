import Link from "next/link";
import { ChevronRight, History } from "lucide-react";
import type { Encounter, Problem } from "@/types";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { encounterDiagnoses } from "@/lib/clinical";

export function VisitListItem({ encounter: e, problems, href }: { encounter: Encounter; problems: Problem[]; href: string }) {
  const diagnoses = encounterDiagnoses(problems, e.id);
  return (
    <Link href={href} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40">
      <div className="w-24 shrink-0">
        <p className="text-sm font-medium text-foreground">{formatDate(e.startedAt)}</p>
        <p className="text-xs text-muted-foreground">
          {e.startedAt ? new Date(e.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""}
        </p>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm text-foreground">{e.chiefComplaint || "Consultation"}</p>
        {diagnoses.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {diagnoses.map(d => (
              <span key={d.id} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                <span className="font-mono">{d.icdCode}</span> {d.name}
              </span>
            ))}
          </div>
        )}
      </div>
      {e.status !== "completed" && <StatusBadge status={e.status} />}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

export function VisitsTab({ patientId, encounters, problems }: { patientId: string; encounters: Encounter[]; problems: Problem[] }) {
  return (
    <SectionCard icon={History} title="Visit history" count={encounters.length} noPadding>
      {encounters.length === 0 ? (
        <EmptyState icon={History} title="No visits yet" description="Signed visits will appear here." />
      ) : (
        <ul className="divide-y">
          {encounters.map(e => (
            <li key={e.id}><VisitListItem encounter={e} problems={problems} href={ROUTES.ENCOUNTER(patientId, e.id)} /></li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
