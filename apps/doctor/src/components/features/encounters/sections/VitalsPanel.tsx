"use client";

import { HeartPulse, UserCheck } from "lucide-react";
import type { Vitals } from "@/types";
import {
  BMI_CATEGORY_LABELS, VITAL_FIELD, assessVital, bmiCategory, calculateBMI,
  type BMICategory, type VitalAssessment, type VitalLevel,
} from "@curo/web/clinical";
import { cn } from "@/lib/utils";
import { SectionCard } from "@curo/web/ui/section-card";
import { toneClass, type Tone } from "@curo/web/ui/status-badge";

type VitalKey = keyof Vitals;

const FIELDS: { key: VitalKey; label: string; unit: string; step?: string }[] = [
  { key: "pulseBpm", label: "Pulse", unit: "bpm" },
  { key: "temperatureC", label: "Temp", unit: "°C", step: "0.1" },
  { key: "spo2Percent", label: "SpO₂", unit: "%" },
  { key: "respirationRpm", label: "Resp. rate", unit: "/min" },
  { key: "heightCm", label: "Height", unit: "cm" },
  { key: "weightKg", label: "Weight", unit: "kg", step: "0.1" },
];

// Vitals already recorded for this visit (nurse triage), shown prefilled.
export interface RecordedVitals {
  vitals: Partial<Vitals>;
  recordedBy: string;
  recordedAt: string | null;
}

interface VitalsPanelProps {
  vitals: Partial<Vitals>;
  onChange: (vitals: Partial<Vitals>) => void;
  recorded?: RecordedVitals | null;
  /** Mark readings outside the usual adult ranges. Off for children, whose ranges differ by age. */
  flagAbnormal?: boolean;
}

const BMI_TONES: Record<BMICategory, Tone> = {
  underweight: "warning",
  healthy: "success",
  overweight: "warning",
  obese: "error",
};

// A reading outside the normal band draws the eye; outside the alert band, more so.
type Flag = VitalAssessment & { level: Exclude<VitalLevel, "normal"> };
const LEVEL_TONES: Record<Flag["level"], Tone> = { alert: "warning", critical: "error" };
const LEVEL_INPUT: Record<Flag["level"], string> = {
  alert: "border-status-warning-border font-medium text-status-warning-text",
  critical: "border-status-error-border font-medium text-status-error-text",
};

const isFlag = (a: VitalAssessment | null): a is Flag => !!a && a.level !== "normal";

export function VitalsPanel({ vitals, onChange, recorded, flagAbnormal = false }: VitalsPanelProps) {
  const bmi = calculateBMI(vitals.heightCm, vitals.weightKg);
  const category = bmi ? bmiCategory(bmi) : null;
  const recordedTime = recorded?.recordedAt
    ? new Date(recorded.recordedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null;

  const set = (key: VitalKey, raw: string) => {
    const next = { ...vitals };
    if (raw === "") delete next[key];
    else next[key] = Number(raw);
    onChange(next);
  };

  const flagOf = (key: VitalKey): Flag | null => {
    const assessment = flagAbnormal ? assessVital(VITAL_FIELD[key], vitals[key]) : null;
    return isFlag(assessment) ? assessment : null;
  };
  // Blood pressure is one reading: its tag is the worse of the two numbers.
  const bp = [flagOf("bpSystolic"), flagOf("bpDiastolic")];
  const bpFlag = bp.find(f => f?.level === "critical") ?? bp.find(f => f !== null) ?? null;

  // "edited" = the doctor changed a value the nurse recorded.
  const edited = (key: VitalKey) => recorded?.vitals[key] !== undefined && vitals[key] !== recorded.vitals[key];

  const input = (key: VitalKey, unit: string, step?: string, label?: string) => (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        aria-label={label ?? key}
        value={vitals[key] ?? ""}
        onChange={e => set(key, e.target.value)}
        className={cn(
          "h-9 w-full rounded-md border border-input bg-background pl-2.5 pr-11 text-sm tabular-nums shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          edited(key) && "border-status-info-border bg-status-info-bg/40",
          flagOf(key) && LEVEL_INPUT[flagOf(key)!.level],
        )}
      />
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">{unit}</span>
    </div>
  );

  return (
    <SectionCard icon={HeartPulse} iconClassName="text-clinical-vitals" title="Vitals">
      <div className="space-y-4">
        {recorded && (
          <div className="flex items-start gap-2 rounded-lg bg-status-teal-bg px-3 py-2 text-xs">
            <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-teal-text" />
            <p className="text-status-teal-text">
              <span className="font-medium">Triage by {recorded.recordedBy}</span>
              {recordedTime && <span className="opacity-80"> · {recordedTime}</span>}
              <span className="block text-muted-foreground">Change a value to record your own reading.</span>
            </p>
          </div>
        )}
        <div className="space-y-1">
          <p className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            Blood pressure
            {bpFlag && <FlagTag assessment={bpFlag} />}
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
            {input("bpSystolic", "sys", undefined, "Systolic")}
            <span className="text-muted-foreground">/</span>
            {input("bpDiastolic", "dia", undefined, "Diastolic")}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {FIELDS.map(({ key, label, unit, step }) => (
            <div key={key} className="space-y-1">
              <p className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                {label}
                {flagOf(key) ? (
                  <FlagTag assessment={flagOf(key)!} />
                ) : (
                  edited(key) && <span className="text-[10px] text-status-info-text" title={`Nurse recorded ${recorded?.vitals[key]}`}>edited</span>
                )}
              </p>
              {input(key, unit, step, label)}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">BMI</span>
          {bmi && category ? (
            <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-medium tabular-nums", toneClass(BMI_TONES[category]))}>
              {bmi} <span className="text-xs font-normal opacity-80">· {BMI_CATEGORY_LABELS[category]}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function FlagTag({ assessment }: { assessment: Flag }) {
  return (
    <span className={cn("rounded px-1 text-[10px] font-semibold uppercase", toneClass(LEVEL_TONES[assessment.level]))} title="Outside the usual adult range">
      {assessment.label}
    </span>
  );
}
