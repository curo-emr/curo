import type { LucideIcon } from "lucide-react";
import type { Vitals } from "@/types";
import { Badge } from "@curo/web/ui/badge";
import { cn } from "@/lib/utils";
import { LEVEL_STYLES, assessVital, worstLevel, type VitalAssessment, type VitalField, type VitalsDraft } from "@/lib/vitals";
import { VitalGauge } from "./VitalGauge";

interface VitalTileProps {
  title: string;
  icon: LucideIcon;
  fields: VitalField[];
  draft: VitalsDraft;
  values: Partial<Vitals>;
  invalid: (keyof Vitals)[];
  previous: Partial<Vitals>;
  disabled?: boolean;
  onChange: (key: keyof Vitals, raw: string) => void;
  separator?: string;               // e.g. "/" between systolic and diastolic
  assessment?: VitalAssessment | null; // overrides the per-field assessment (BMI on the body tile)
  className?: string;
  children?: React.ReactNode;       // extra readout under the inputs
}

// One monitor-style readout: big numerals, a status pill and a range gauge per field.
export function VitalTile({
  title, icon: Icon, fields, draft, values, invalid, previous, disabled, onChange,
  separator, assessment, className, children,
}: VitalTileProps) {
  const assessments = fields.map(f => assessVital(f, values[f.key]));
  const level = assessment !== undefined ? assessment?.level ?? null : worstLevel(assessments);
  const pill = assessment !== undefined
    ? assessment
    : assessments.find(a => a?.level === level) ?? null;
  const previousText = fields.every(f => previous[f.key] === undefined)
    ? null
    : separator
      ? `${fields.map(f => previous[f.key] ?? "—").join(` ${separator} `)} ${fields[0].unit}`
      : fields.map(f => `${previous[f.key] ?? "—"} ${f.unit}`).join(" · ");

  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm transition-colors duration-300 focus-within:ring-2 focus-within:ring-primary/25",
        level && LEVEL_STYLES[level].tile,
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {title}
        </h3>
        {pill && (
          <Badge variant="outline" className={cn("font-medium", LEVEL_STYLES[pill.level].pill)}>
            {pill.label}
          </Badge>
        )}
      </header>

      <div className="mt-3 flex items-end gap-3">
        {fields.map((field, i) => {
          const id = `vital-${field.key}`;
          const isInvalid = invalid.includes(field.key);
          return (
            <div key={field.key} className="flex min-w-0 flex-1 items-end gap-3">
              {i > 0 && separator && (
                <span aria-hidden className="pb-1 font-mono text-3xl font-light text-muted-foreground/60">{separator}</span>
              )}
              <div className="min-w-0 flex-1">
                {fields.length > 1 && (
                  <label htmlFor={id} className="block text-xs text-muted-foreground">{field.label}</label>
                )}
                <div className="flex items-baseline gap-1.5">
                  <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    step={field.step}
                    min={field.plausible[0]}
                    max={field.plausible[1]}
                    placeholder="—"
                    aria-label={fields.length > 1 ? undefined : `${field.label} (${field.unit})`}
                    aria-invalid={isInvalid || undefined}
                    disabled={disabled}
                    value={draft[field.key] ?? ""}
                    onChange={e => onChange(field.key, e.target.value)}
                    className={cn(
                      "field-sizing-content min-w-[2ch] max-w-full rounded-md bg-transparent font-mono text-4xl font-semibold tabular-nums text-foreground",
                      "placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-60",
                      "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                      isInvalid && "text-status-error-text",
                    )}
                  />
                  <span className="shrink-0 text-sm text-muted-foreground">{field.unit}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {invalid.some(k => fields.some(f => f.key === k)) && (
        <p className="mt-1 text-xs text-status-error-text">
          {fields.filter(f => invalid.includes(f.key)).map(f =>
            `${f.label} should be between ${f.plausible[0]} and ${f.plausible[1]} ${f.unit}`).join(". ")}
          . Check the reading.
        </p>
      )}

      {children}

      <div className="mt-4 space-y-3">
        {fields.map((field, i) => (
          <VitalGauge key={field.key} field={field} value={values[field.key]} assessment={assessments[i]} />
        ))}
      </div>

      {previousText && (
        <p className="mt-3 text-xs text-muted-foreground">
          Last recorded <span className="font-mono text-foreground/70">{previousText}</span>
        </p>
      )}
    </section>
  );
}
