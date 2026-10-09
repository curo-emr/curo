import { Card } from "../ui/card";
import { StackedBar } from "../ui/stacked-bar";
import { cn } from "cn";
import { FLOW_STAGES, NOT_ARRIVED, STAGE_META, stageDotClass, type QueueStage, type StageStyle } from "./stages";

interface FlowOverviewProps {
  /** The headline count, e.g. "12 checked in today". */
  summary: React.ReactNode;
  /** How many patients are at each stage, e.g. from `countStages`. */
  counts: Record<QueueStage, number>;
  /** Booked but not here yet, for a screen that sees the day before check-in. */
  notArrived?: number;
}

type Part = StageStyle & { count: number };

// Today's patients as one bar split by where they are in the flow, with a legend.
// Like the doctor's Today, the bar fills from the left as patients finish.
export function FlowOverview({ summary, counts, notArrived }: FlowOverviewProps) {
  const parts: Part[] = [
    ...(notArrived === undefined ? [] : [{ ...NOT_ARRIVED, count: notArrived }]),
    ...FLOW_STAGES.map(stage => ({ ...STAGE_META[stage], count: counts[stage] })),
  ];

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="flex items-baseline gap-1.5 text-sm text-muted-foreground">{summary}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {parts.map(part => (
            <li key={part.label} className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn("size-2 rounded-full", stageDotClass(part))} />
              <span className="font-medium tabular-nums text-foreground">{part.count}</span>
              {part.label}
            </li>
          ))}
        </ul>
      </div>
      <StackedBar segments={[...parts].reverse()} />
    </Card>
  );
}
