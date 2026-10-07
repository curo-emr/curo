import { AlertTriangle, ChevronRight, ClipboardList, HeartPulse, History, Pill } from "lucide-react";
import type { Allergy, Encounter, Patient, Prescription, Problem, Vitals } from "@/types";
import { SectionCard } from "@curo/web/ui/section-card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { Button } from "@curo/web/ui/button";
import { ROUTES } from "@/lib/constants";
import { calculateBMI, formatDate, formatRelative } from "@/lib/utils";
import { recentPrescriptionItems, uniqueActiveProblems } from "@/lib/clinical";
import { VisitListItem } from "./VisitsTab";

interface SummaryTabProps {
  patient: Patient;
  allergies: Allergy[];
  problems: Problem[];
  encounters: Encounter[];
  prescriptions: Prescription[];
  latestVitals: { vitals: Partial<Vitals>; recordedAt: string | null };
  onShowTab: (tab: string) => void;
}

const SEVERITY_STYLES: Record<Allergy["severity"], string> = {
  severe: "bg-status-error-bg text-status-error-text",
  moderate: "bg-status-warning-bg text-status-warning-text",
  mild: "bg-status-info-bg text-status-info-text",
};

export function SummaryTab({ patient, allergies, problems, encounters, prescriptions, latestVitals, onShowTab }: SummaryTabProps) {
  const active = uniqueActiveProblems(problems);
  const currentMeds = recentPrescriptionItems(prescriptions);
  const v = latestVitals.vitals;
  const vitalTiles = [
    { label: "Blood pressure", value: v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : null, unit: "mmHg" },
    { label: "Pulse", value: v.pulseBpm, unit: "bpm" },
    { label: "Temp", value: v.temperatureC, unit: "°C" },
    { label: "SpO₂", value: v.spo2Percent, unit: "%" },
    { label: "Weight", value: v.weightKg, unit: "kg" },
    { label: "BMI", value: v.heightCm && v.weightKg ? calculateBMI(v.heightCm, v.weightKg) : null, unit: "" },
  ].filter(t => t.value);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard icon={ClipboardList} iconClassName="text-clinical-diagnosis" title="Active problems" count={active.length} noPadding>
        {active.length === 0 ? (
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
        )}
      </SectionCard>

      <SectionCard icon={AlertTriangle} iconClassName="text-status-error-text" title="Allergies" count={allergies.length} noPadding>
        {allergies.length === 0 ? (
          <EmptyState title="No known allergies" className="py-8" />
        ) : (
          <ul className="divide-y">
            {allergies.map(a => (
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
      </SectionCard>

      <SectionCard icon={Pill} iconClassName="text-clinical-rx" title="Current medications" description="Prescribed in the last 90 days" noPadding
        headerRight={prescriptions.length > 0 && <Button variant="ghost" size="sm" className="text-primary" onClick={() => onShowTab("medications")}>All <ChevronRight /></Button>}>
        {currentMeds.length === 0 ? (
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
        )}
      </SectionCard>

      <SectionCard icon={HeartPulse} iconClassName="text-clinical-vitals" title="Latest vitals"
        description={latestVitals.recordedAt ? `Recorded ${formatRelative(latestVitals.recordedAt)}` : undefined}
        headerRight={<Button variant="ghost" size="sm" className="text-primary" onClick={() => onShowTab("trends")}>Trends <ChevronRight /></Button>}>
        {vitalTiles.length === 0 ? (
          <EmptyState title="No vitals recorded" className="py-4" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {vitalTiles.map(t => (
              <div key={t.label} className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">{t.label}</p>
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  {t.value} <span className="text-xs font-normal text-muted-foreground">{t.unit}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard icon={History} title="Recent visits" count={encounters.length} className="lg:col-span-2" noPadding
        headerRight={encounters.length > 3 && <Button variant="ghost" size="sm" className="text-primary" onClick={() => onShowTab("visits")}>All visits <ChevronRight /></Button>}>
        {encounters.length === 0 ? (
          <EmptyState icon={History} title="No visits yet" description="Signed visits will appear here." />
        ) : (
          <ul className="divide-y">
            {encounters.slice(0, 3).map(e => (
              <li key={e.id}><VisitListItem encounter={e} problems={problems} href={ROUTES.ENCOUNTER(patient.id, e.id)} /></li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

