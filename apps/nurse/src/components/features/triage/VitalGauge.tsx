import { cn } from "@/lib/utils";
import { LEVEL_STYLES, type VitalAssessment, type VitalField } from "@/lib/vitals";

// A thin scale with the normal band shaded and a marker at the current value.
export function VitalGauge({ field, value, assessment }: { field: VitalField; value?: number; assessment: VitalAssessment | null }) {
  if (!field.scale || !field.normal) return null;
  const [min, max] = field.scale;
  const pct = (n: number) => `${((Math.min(Math.max(n, min), max) - min) / (max - min)) * 100}%`;
  const [lo, hi] = field.normal;

  return (
    <div
      role="img"
      aria-label={`${field.label}: normal range ${lo} to ${hi} ${field.unit}${value !== undefined ? `, current ${value}` : ""}`}
      className="space-y-1"
    >
      <div className="relative h-1.5 rounded-full bg-muted">
        <div
          className="absolute inset-y-0 rounded-full bg-status-success-text/25"
          style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }}
        />
        {value !== undefined && (
          <div
            className={cn(
              "absolute top-1/2 h-3.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card transition-[left] duration-300 ease-out motion-reduce:transition-none",
              LEVEL_STYLES[assessment?.level ?? "normal"].marker,
            )}
            style={{ left: pct(value) }}
          />
        )}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground tabular-nums">
        <span>{min}</span>
        <span>normal {lo}–{hi}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
