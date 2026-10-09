"use client";

import { AlertTriangle, ChevronRight, ClipboardList, HeartPulse, History, Pill } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import type { Allergy, Patient, Vitals } from "@/types";
import { SectionCard } from "@curo/web/ui/section-card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { Button } from "@curo/web/ui/button";
import { ROUTES } from "@/lib/constants";
import { formatRelative } from "@curo/web/format";
import { calculateBMI, formatDate } from "@/lib/utils";
import { recentPrescriptionItems, uniqueActiveProblems } from "@/lib/clinical";
import { patientQueries } from "@/lib/queries";
import { VisitListItem } from "./VisitsTab";

interface SummaryTabProps {
  patient: Patient;
  onShowTab: (tab: string) => void;
}

const SEVERITY_STYLES: Record<Allergy["severity"], string> = {
  severe: "bg-status-error-bg text-status-error-text",
  moderate: "bg-status-warning-bg text-status-warning-text",
  mild: "bg-status-info-bg text-status-info-text",
};

const vitalTiles = (v: Partial<Vitals>) => [
  { label: "Blood pressure", value: v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : null, unit: "mmHg" },
  { label: "Pulse", value: v.pulseBpm, unit: "bpm" },
  { label: "Temp", value: v.temperatureC, unit: "°C" },
  { label: "SpO₂", value: v.spo2Percent, unit: "%" },
  { label: "Weight", value: v.weightKg, unit: "kg" },
  { label: "BMI", value: v.heightCm && v.weightKg ? calculateBMI(v.heightCm, v.weightKg) : null, unit: "" },
].filter(t => t.value);

export function SummaryTab({ patient, onShowTab }: SummaryTabProps) {
  const problems = useQuery(patientQueries.conditions(patient.id));
  const allergies = useQuery(patientQueries.allergies(patient.id));
  const prescriptions = useQuery(patientQueries.prescriptions(patient.id));
  const latestVitals = useQuery(patientQueries.latestVitals(patient.id));
  const encounters = useQuery(patientQueries.encounters(patient.id));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard icon={ClipboardList} iconClassName="text-clinical-diagnosis" title="Active problems"
        count={problems.data && uniqueActiveProblems(problems.data).length} noPadding>
        <QueryContent query={problems} what="problems">
          {list => {
            const active = uniqueActiveProblems(list);
            return active.length === 0 ? (
              <EmptyState title="No active problems" className="py-8" />
            ) : (
              <ul className="divide-y">
                {active.map(p => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      {p.onsetDate && <p className="text-xs text-muted-foreground">Since {formatDate(p.onsetDate)}</p>}
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{p.icdCode}</span>
                  </li>
                ))}
              </ul>
            );
          }}
        </QueryContent>
      </SectionCard>

      <SectionCard icon={AlertTriangle} iconClassName="text-status-error-text" title="Allergies" count={allergies.data?.length} noPadding>
        <QueryContent query={allergies} what="allergies">
          {list => list.length === 0 ? (
            <EmptyState title="No known allergies" className="py-8" />
          ) : (
            <ul className="divide-y">
              {list.map(a => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.substance}</p>
                    <p className="text-xs text-muted-foreground">{a.reaction || "Reaction not recorded"}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.mild}`}>{a.severity}</span>
                </li>
              ))}
            </ul>
          )}
        </QueryContent>
      </SectionCard>

      <SectionCard icon={Pill} iconClassName="text-clinical-rx" title="Current medications" description="Prescribed in the last 90 days" noPadding
        headerRight={!!prescriptions.data?.length && <Button variant="ghost" size="sm" className="text-primary" onClick={() => onShowTab("medications")}>All <ChevronRight /></Button>}>
        <QueryContent query={prescriptions} what="medications">
          {list => {
            const currentMeds = recentPrescriptionItems(list);
            return currentMeds.length === 0 ? (
              <EmptyState title="No recent prescriptions" className="py-8" />
            ) : (
              <ul className="divide-y">
                {currentMeds.map(({ item, date }) => (
                  <li key={item.displayName} className="px-5 py-3">
                    <p className="text-sm font-medium text-foreground">{item.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {[item.dose, item.frequency, item.durationDays ? `${item.durationDays} days` : ""].filter(Boolean).join(" · ")} · {formatDate(date)}
                    </p>
                  </li>
                ))}
              </ul>
            );
          }}
        </QueryContent>
      </SectionCard>

      <SectionCard icon={HeartPulse} iconClassName="text-clinical-vitals" title="Latest vitals"
        description={latestVitals.data?.recordedAt ? `Recorded ${formatRelative(latestVitals.data.recordedAt)}` : undefined}
        headerRight={<Button variant="ghost" size="sm" className="text-primary" onClick={() => onShowTab("trends")}>Trends <ChevronRight /></Button>}>
        <QueryContent query={latestVitals} what="vitals">
          {({ vitals }) => {
            const tiles = vitalTiles(vitals);
            return tiles.length === 0 ? (
              <EmptyState title="No vitals recorded" className="py-4" />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {tiles.map(t => (
                  <div key={t.label} className="rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">{t.label}</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {t.value} <span className="text-xs font-normal text-muted-foreground">{t.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            );
          }}
        </QueryContent>
      </SectionCard>

      <SectionCard icon={History} title="Recent visits" count={encounters.data?.length} className="lg:col-span-2" noPadding
        headerRight={(encounters.data?.length ?? 0) > 3 && <Button variant="ghost" size="sm" className="text-primary" onClick={() => onShowTab("visits")}>All visits <ChevronRight /></Button>}>
        <QueryContent query={encounters} what="visits">
          {list => list.length === 0 ? (
            <EmptyState icon={History} title="No visits yet" description="Signed visits will appear here." />
          ) : (
            <ul className="divide-y">
              {list.slice(0, 3).map(e => (
                <li key={e.id}><VisitListItem encounter={e} problems={problems.data ?? []} href={ROUTES.ENCOUNTER(patient.id, e.id)} /></li>
              ))}
            </ul>
          )}
        </QueryContent>
      </SectionCard>
    </div>
  );
}
