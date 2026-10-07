import { ArrowLeft, Loader2, Send } from "lucide-react";
import type { Vitals } from "@/types";
import { Button } from "@curo/web/ui/button";
import { cn } from "@/lib/utils";
import {
  LEVEL_STYLES, VITAL_FIELD, VITAL_FIELDS, assessBMI, assessVital, calculateBMI, worstLevel,
  type VitalAssessment,
} from "@/lib/vitals";

interface TriageSummaryProps {
  values: Partial<Vitals>;
  doctorName: string;
  saving: boolean;
  readOnly: boolean;
  canSave: boolean;
  returnLabel: string;
  onSave: () => void;
  onReturn: () => void;
}

interface Row {
  label: string;
  value: string | null;
  assessment: VitalAssessment | null;
}

function summaryRows(v: Partial<Vitals>): Row[] {
  const one = (key: keyof Vitals, label: string): Row => {
    const f = VITAL_FIELD[key];
    return { label, value: v[key] !== undefined ? `${v[key]} ${f.unit}` : null, assessment: assessVital(f, v[key]) };
  };
  const bmi = calculateBMI(v.heightCm, v.weightKg);
  const bp = [assessVital(VITAL_FIELD.bpSystolic, v.bpSystolic), assessVital(VITAL_FIELD.bpDiastolic, v.bpDiastolic)];
  const bpLevel = worstLevel(bp);
  return [
    {
      label: "Blood pressure",
      value: v.bpSystolic !== undefined || v.bpDiastolic !== undefined ? `${v.bpSystolic ?? "—"}/${v.bpDiastolic ?? "—"} mmHg` : null,
      assessment: bp.find(a => a?.level === bpLevel) ?? null,
    },
    one("pulseBpm", "Pulse"),
    one("spo2Percent", "SpO₂"),
    one("temperatureC", "Temperature"),
    one("respirationRpm", "Respiration"),
    one("heightCm", "Height"),
    one("weightKg", "Weight"),
    { label: "BMI", value: bmi ? String(bmi) : null, assessment: bmi ? assessBMI(bmi) : null },
  ];
}

// Right rail: everything the doctor will see, then the send action.
export function TriageSummary({ values, doctorName, saving, readOnly, canSave, returnLabel, onSave, onReturn }: TriageSummaryProps) {
  const rows = summaryRows(values);
  const recorded = VITAL_FIELDS.filter(f => values[f.key] !== undefined).length;
  const flagged = rows.filter(r => r.assessment && r.assessment.level !== "normal").length;

  return (
    <aside className="rounded-xl border bg-card shadow-sm lg:sticky lg:top-0">
      <div className="border-b px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">For {doctorName}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {recorded} of {VITAL_FIELDS.length} recorded
          {flagged > 0 && <> · <span className="font-medium text-status-warning-text">{flagged} outside normal range</span></>}
        </p>
      </div>

      <dl className="divide-y px-5">
        {rows.map(row => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  row.assessment ? LEVEL_STYLES[row.assessment.level].marker : "bg-border",
                )}
              />
              {row.label}
            </dt>
            <dd className={cn("font-mono tabular-nums", row.value ? "text-foreground" : "text-muted-foreground/50")}>
              {row.value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>

      <div className="space-y-2 border-t p-5">
        {!readOnly && (
          <Button className="w-full" size="lg" onClick={onSave} disabled={saving || !canSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {saving ? "Sending…" : "Save & send to doctor"}
          </Button>
        )}
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={onReturn} disabled={saving}>
          <ArrowLeft className="h-4 w-4" /> {returnLabel}
        </Button>
      </div>
    </aside>
  );
}
