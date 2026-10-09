"use client";

import Link from "next/link";
import { ArrowRight, HeartPulse, Loader2 } from "lucide-react";
import { Card } from "@curo/web/ui/card";
import { Button } from "@curo/web/ui/button";
import { EmptyState } from "@curo/web/ui/empty-state";
import { NextForTriageCard } from "@/components/features/dashboard/NextForTriageCard";
import { patientName } from "@/components/features/queue/QueueRow";
import { useTodayQueue, type QueueEntry } from "@/lib/hooks/useTodayQueue";
import { useTriageActions } from "@/lib/hooks/useTriageActions";
import { useCurrentPractitioner } from "@/lib/hooks/useCurrentPractitioner";
import { FLOW_STAGES, FlowOverview, countStages } from "@curo/web/flow";
import { nextForTriage } from "@/lib/queue";
import { ROUTES } from "@/lib/constants";
import { minutesSince } from "@/lib/utils";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// The day at a glance and the one patient to take next; the full list is the triage queue.
export default function DashboardPage() {
  const { entries, status, refresh } = useTodayQueue(FLOW_STAGES);
  const { openTriage, skipToDoctor, pendingId } = useTriageActions();
  const me = useCurrentPractitioner();

  const counts = countStages(entries.map(e => e.appointment.queueStage));
  const next = nextForTriage(entries);

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <p className="text-sm text-muted-foreground">{today}</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {greeting()}{me ? `, ${me.name.first}` : ""}
        </h1>
      </div>

      {status === "loading" ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : status === "error" ? (
        <Card>
          <EmptyState
            icon={HeartPulse}
            title="Today's queue could not be loaded"
            description="Check your connection, then try again."
            action={<Button variant="outline" size="sm" onClick={refresh}>Try again</Button>}
          />
        </Card>
      ) : (
        <>
          <FlowOverview
            counts={counts}
            summary={
              <>
                <span className="text-2xl font-semibold tabular-nums text-foreground">{entries.length}</span>
                checked in today
              </>
            }
          />
          <NextForTriageCard
            entry={next}
            pending={!!next && pendingId === next.appointment.id}
            onOpen={() => next && openTriage(next.appointment)}
            onSkip={() => next && skipToDoctor(next.appointment, patientName(next))}
          >
            {next && <WaitingRoom entries={entries} next={next} />}
          </NextForTriageCard>
        </>
      )}
    </div>
  );
}

// Who else is waiting and for how long, with the way into the full queue.
function WaitingRoom({ entries, next }: { entries: QueueEntry[]; next: QueueEntry }) {
  // The rest of the waiting room; the card above already shows how long its patient has waited.
  const waits = entries
    .filter(e => e !== next && e.appointment.queueStage === "waiting_nurse")
    .map(e => minutesSince(e.appointment.stageSince));
  const longest = Math.max(0, ...waits);
  const average = waits.length ? Math.round(waits.reduce((sum, m) => sum + m, 0) / waits.length) : 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
      <p className="text-muted-foreground">
        {waits.length === 0 ? (
          "No one else is waiting."
        ) : (
          <>
            <span className="font-medium tabular-nums text-foreground">{waits.length}</span> more waiting
            <span className="mx-2 text-border">·</span>
            longest wait <span className="font-medium tabular-nums text-foreground">{longest}m</span>
            <span className="mx-2 text-border">·</span>
            average <span className="font-medium tabular-nums text-foreground">{average}m</span>
          </>
        )}
      </p>
      <Link href={ROUTES.TRIAGE_QUEUE} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
        Open triage queue <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
