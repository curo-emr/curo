import type { QueueStage } from "@/types";
import { Card } from "@curo/web/ui/card";
import { StackedBar } from "@curo/web/ui/stacked-bar";
import { FLOW_STAGES, STAGE_META, stageDotClass } from "@/lib/queue";
import { cn } from "@/lib/utils";

// Like the doctor's Today, the bar fills from the left as patients finish.
const BAR_ORDER = [...FLOW_STAGES].reverse();

// Today's checked-in patients as one bar, split by where they are in the flow.
export function FlowStrip({ counts }: { counts: Record<QueueStage, number> }) {
  const total = FLOW_STAGES.reduce((sum, s) => sum + counts[s], 0);

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="flex items-baseline gap-1.5 text-sm text-muted-foreground">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{total}</span>
          checked in today
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {FLOW_STAGES.map(stage => (
            <li key={stage} className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn("size-2 rounded-full", stageDotClass(stage))} />
              <span className="font-medium tabular-nums text-foreground">{counts[stage]}</span>
              {STAGE_META[stage].label}
            </li>
          ))}
        </ul>
      </div>
      <StackedBar segments={BAR_ORDER.map(stage => ({ ...STAGE_META[stage], count: counts[stage] }))} />
    </Card>
  );
}
