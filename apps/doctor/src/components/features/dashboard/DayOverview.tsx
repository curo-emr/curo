import type { Appointment } from "@/types";
import { Card } from "@curo/web/ui/card";
import { toneDotClass } from "@curo/web/ui/status-badge";
import { StackedBar } from "@curo/web/ui/stacked-bar";
import { cn } from "@/lib/utils";
import { QUEUE_GROUPS, getQueueGroup, isMissed, type QueueGroup } from "@/lib/visit";

// The bar fills from the left as the day goes: finished first, then whoever is closest to done.
const BAR_ORDER: QueueGroup[] = ["done", "consultation", "ready", "triage", "upcoming"];

// How far through the day the doctor is, and where everyone else stands.
export function DayOverview({ appointments }: { appointments: Appointment[] }) {
  // Cancellations and no-shows are neither seen nor still to see, so they're counted apart.
  const expected = appointments.filter(a => !isMissed(a));
  const missed = appointments.length - expected.length;
  const total = expected.length;
  const counts = Object.fromEntries(QUEUE_GROUPS.map(g => [g.id, 0])) as Record<QueueGroup, number>;
  expected.forEach(a => counts[getQueueGroup(a)]++);
  const groups = Object.fromEntries(QUEUE_GROUPS.map(g => [g.id, g]));

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="flex items-baseline gap-1.5 text-sm text-muted-foreground">
          <span className={cn("size-2 -translate-y-0.5 self-center rounded-full", toneDotClass(groups.done.tone))} />
          <span className="text-2xl font-semibold tabular-nums text-foreground">{counts.done}</span>
          <span className="tabular-nums">of {total} patients seen</span>
          {missed > 0 && <span className="tabular-nums text-xs">· {missed} cancelled or no-show</span>}
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {QUEUE_GROUPS.filter(g => g.id !== "done").map(g => (
            <li key={g.id} className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn("size-2 rounded-full", toneDotClass(g.tone))} />
              <span className="font-medium tabular-nums text-foreground">{counts[g.id]}</span>
              {g.label}
            </li>
          ))}
        </ul>
      </div>
      <StackedBar
        segments={BAR_ORDER.map(id => ({
          label: groups[id].label,
          count: counts[id],
          tone: groups[id].tone,
          faded: id === "upcoming",
        }))}
      />
    </Card>
  );
}
