"use client";

import { Vitals } from "@/types";
import { calculateBMI, getBMICategory } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

const VITAL_FIELDS = [
  { key: 'bpSystolic' as const, label: 'BP Systolic', unit: 'mmHg' },
  { key: 'bpDiastolic' as const, label: 'BP Diastolic', unit: 'mmHg' },
  { key: 'pulseBpm' as const, label: 'Pulse', unit: 'bpm' },
  { key: 'temperatureC' as const, label: 'Temp (\u00B0C)', unit: '\u00B0C' },
  { key: 'spo2Percent' as const, label: 'SpO2 (%)', unit: '%' },
  { key: 'respirationRpm' as const, label: 'Resp (rpm)', unit: 'rpm' },
  { key: 'heightCm' as const, label: 'Height (cm)', unit: 'cm' },
  { key: 'weightKg' as const, label: 'Weight (kg)', unit: 'kg' },
];

interface VitalsPanelProps {
  vitals: Partial<Vitals>;
  setVitals: React.Dispatch<React.SetStateAction<Partial<Vitals>>>;
}

export function VitalsPanel({ vitals, setVitals }: VitalsPanelProps) {
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

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-rose-500" /> Vitals
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {VITAL_FIELDS.map(({ key, label, unit }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                type="number"
                placeholder={unit}
                className="h-8 text-sm"
                value={vitals[key] || ''}
                onChange={e => setVitals(v => ({ ...v, [key]: Number(e.target.value) }))}
              />
            </div>
          ))}
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
