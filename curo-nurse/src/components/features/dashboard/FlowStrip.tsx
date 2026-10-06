import type { QueueStage } from "@/types";
import { FLOW_STAGES, STAGE_META } from "@/lib/queue";
import { cn } from "@/lib/utils";

// Today's checked-in patients as one band, split by where they are in the flow.
export function FlowStrip({ counts }: { counts: Record<QueueStage, number> }) {
  const total = FLOW_STAGES.reduce((sum, s) => sum + counts[s], 0);

  return (
    <section aria-label="Today's patient flow" className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-foreground">Today&apos;s patient flow</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-base font-semibold text-foreground tabular-nums">{total}</span> checked in
        </p>
      </div>

      <div className="mt-4 flex h-3 w-full gap-1 overflow-hidden rounded-full bg-muted">
        {total > 0 &&
          FLOW_STAGES.filter(s => counts[s] > 0).map(stage => (
            <div
              key={stage}
              className={cn("h-full rounded-full transition-[flex-grow] duration-700 ease-out", STAGE_META[stage].bar)}
              style={{ flexGrow: counts[stage] }}
              title={`${STAGE_META[stage].label}: ${counts[stage]}`}
            />
          ))}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {FLOW_STAGES.map(stage => (
          <div key={stage} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", STAGE_META[stage].dot)} />
              <span className="truncate">{STAGE_META[stage].label}</span>
            </dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">{counts[stage]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
