"use client";

import { Vitals } from "@/types";
import { calculateBMI, cn, getBMICategory } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Activity, UserCheck } from "lucide-react";

const VITAL_FIELDS = [
  { key: 'bpSystolic' as const, label: 'BP Systolic', unit: 'mmHg' },
  { key: 'bpDiastolic' as const, label: 'BP Diastolic', unit: 'mmHg' },
  { key: 'pulseBpm' as const, label: 'Pulse', unit: 'bpm' },
  { key: 'temperatureC' as const, label: 'Temp (°C)', unit: '°C' },
  { key: 'spo2Percent' as const, label: 'SpO2 (%)', unit: '%' },
  { key: 'respirationRpm' as const, label: 'Resp (rpm)', unit: 'rpm' },
  { key: 'heightCm' as const, label: 'Height (cm)', unit: 'cm' },
  { key: 'weightKg' as const, label: 'Weight (kg)', unit: 'kg' },
];

// Vitals already recorded for this visit (nurse triage), shown prefilled.
export interface RecordedVitals {
  vitals: Partial<Vitals>;
  recordedBy: string;
  recordedAt: string | null;
}

interface VitalsPanelProps {
  vitals: Partial<Vitals>;
  setVitals: React.Dispatch<React.SetStateAction<Partial<Vitals>>>;
  recorded?: RecordedVitals | null;
}

export function VitalsPanel({ vitals, setVitals, recorded }: VitalsPanelProps) {
  const bmi = vitals.heightCm && vitals.weightKg ? calculateBMI(vitals.heightCm, vitals.weightKg) : null;
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  const bmiVariant = () => {
    if (!bmiCategory) return 'secondary' as const;
    if (bmiCategory === 'obese') return 'destructive' as const;
    return 'outline' as const;
  };

  const bmiClass = () => {
    if (!bmiCategory) return '';
    if (bmiCategory === 'obese') return '';
    if (bmiCategory === 'overweight') return 'text-status-warning-text border-status-warning-border bg-status-warning-bg';
    return 'text-status-success-text border-status-success-border bg-status-success-bg';
  };

  const recordedTime = recorded?.recordedAt
    ? new Date(recorded.recordedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-rose-500" /> Vitals
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {recorded && (
          <div className="flex items-start gap-2.5 rounded-lg border border-status-teal-border bg-status-teal-bg/60 px-3 py-2.5">
            <UserCheck className="h-4 w-4 mt-0.5 shrink-0 text-status-teal-text" />
            <div className="min-w-0 text-xs leading-relaxed">
              <p className="font-medium text-status-teal-text">
                Triage vitals recorded by {recorded.recordedBy}
                {recordedTime && <span className="font-normal opacity-80"> · {recordedTime}</span>}
              </p>
              <p className="text-muted-foreground">Edit any value to record your own measurement.</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {VITAL_FIELDS.map(({ key, label, unit }) => {
            const nurseValue = recorded?.vitals[key];
            const edited = nurseValue !== undefined && vitals[key] !== nurseValue;
            return (
              <div key={key} className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center justify-between gap-1">
                  {label}
                  {edited && (
                    <span className="text-[10px] font-medium text-status-info-text" title={`Nurse recorded ${nurseValue}`}>
                      edited
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  placeholder={unit}
                  className={cn("h-8 text-sm", edited && "border-status-info-border")}
                  value={vitals[key] || ''}
                  onChange={e => setVitals(v => ({ ...v, [key]: Number(e.target.value) }))}
                />
              </div>
            );
          })}
        </div>
        <div className="pt-3 mt-3 border-t flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Calculated BMI</span>
          {bmi ? (
            <Badge variant={bmiVariant()} className={`text-sm py-1 ${bmiClass()}`}>
              {bmi} <span className="ml-1 text-xs capitalize opacity-80">({bmiCategory})</span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-sm py-1 text-muted-foreground">--</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
