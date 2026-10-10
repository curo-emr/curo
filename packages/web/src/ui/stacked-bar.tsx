import { cn } from "./utils";
import { toneDotClass, type Tone } from "./tones";

export interface BarSegment {
  label: string;
  count: number;
  tone: Tone;
  /** Drawn faintly, for a part that hasn't started yet. */
  faded?: boolean;
}

// One thin bar split into coloured parts by count, e.g. where today's patients are in the flow.
// Parts are drawn in the order given; empty ones are left out.
export function StackedBar({ segments, className }: { segments: BarSegment[]; className?: string }) {
  return (
    <div
      role="img"
      aria-label={segments.map(s => `${s.count} ${s.label.toLowerCase()}`).join(", ")}
      className={cn("flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted", className)}
    >
      {segments.filter(s => s.count > 0).map(s => (
        <div
          key={s.label}
          className={cn("h-full basis-0 first:rounded-l-full last:rounded-r-full", toneDotClass(s.tone), s.faded && "opacity-30")}
          style={{ flexGrow: s.count }}
        />
      ))}
    </div>
  );
}

/** The bar's parts as a list: a dot in each part's tone, its label and its count. */
export function StackedBarLegend({ segments }: { segments: BarSegment[] }) {
  return (
    <ul className="space-y-2">
      {segments.map(s => (
        <li key={s.label} className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-foreground">
            <span className={cn("size-2 rounded-full", toneDotClass(s.tone))} /> {s.label}
          </span>
          <span className="tabular-nums text-muted-foreground">{s.count}</span>
        </li>
      ))}
    </ul>
  );
}
