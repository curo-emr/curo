"use client";

import Link from "next/link";
import { ArrowRight, HeartPulse, Hourglass, Loader2, Timer, UserRoundCheck } from "lucide-react";
import type { QueueStage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Button } from "@curo/web/ui/button";
import { EmptyState } from "@curo/web/ui/empty-state";
import { FlowStrip } from "@/components/features/dashboard/FlowStrip";
import { QueueRow, patientName } from "@/components/features/queue/QueueRow";
import { useTodayQueue } from "@/lib/hooks/useTodayQueue";
import { useTriageActions } from "@/lib/hooks/useTriageActions";
import { useCurrentPractitioner } from "@/lib/hooks/useCurrentPractitioner";
import { FLOW_STAGES } from "@/lib/queue";
import { ROUTES } from "@/lib/constants";
import { minutesSince } from "@/lib/utils";

const UP_NEXT_LIMIT = 5;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { entries, status, refresh } = useTodayQueue(FLOW_STAGES);
  const { openTriage, skipToDoctor, pendingId } = useTriageActions(refresh);
  const me = useCurrentPractitioner();

  const counts = Object.fromEntries(
    FLOW_STAGES.map(stage => [stage, entries.filter(e => e.appointment.queueStage === stage).length]),
  ) as Record<QueueStage, number>;

  // In-triage first (unfinished work), then the waiting room in appointment order.
  const upNext = [
    ...entries.filter(e => e.appointment.queueStage === "with_nurse"),
    ...entries.filter(e => e.appointment.queueStage === "waiting_nurse"),
  ].slice(0, UP_NEXT_LIMIT);

  const waits = entries
    .filter(e => e.appointment.queueStage === "waiting_nurse")
    .map(e => ({ entry: e, minutes: minutesSince(e.appointment.stageSince) }));
  const longest = waits.reduce<(typeof waits)[number] | null>((a, b) => (!a || b.minutes > a.minutes ? b : a), null);
  const averageWait = waits.length ? Math.round(waits.reduce((sum, w) => sum + w.minutes, 0) / waits.length) : 0;
  const sentOn = counts.ready_for_doctor + counts.with_doctor + counts.done;

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {greeting()}{me ? `, ${me.name.first}` : ""}
          </h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={ROUTES.TRIAGE_QUEUE}>
            Open triage queue <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {status === "loading" ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : status === "error" ? (
        <Card className="shadow-sm border">
          <EmptyState
            icon={HeartPulse}
            title="Today's queue could not be loaded"
            description="Check your connection, then try again."
            action={<Button variant="outline" size="sm" onClick={refresh}>Try again</Button>}
          />
        </Card>
      ) : (
        <>
          <FlowStrip counts={counts} />

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="shadow-sm border lg:col-span-2">
              <CardHeader className="bg-muted/50 border-b py-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-rose-500" /> Up next for triage
                </CardTitle>
                {counts.waiting_nurse + counts.with_nurse > UP_NEXT_LIMIT && (
                  <Link href={ROUTES.TRIAGE_QUEUE} className="text-xs font-medium text-primary hover:underline">
                    View all {counts.waiting_nurse + counts.with_nurse}
                  </Link>
                )}
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {upNext.length === 0 ? (
                  <EmptyState
                    icon={UserRoundCheck}
                    title="No one is waiting for triage"
                    description="Patients appear here as soon as reception checks them in."
                  />
                ) : (
                  upNext.map(entry => (
                    <QueueRow
                      key={entry.appointment.id}
                      entry={entry}
                      pending={pendingId === entry.appointment.id}
                      onOpen={() => openTriage(entry.appointment)}
                      onSkip={() => skipToDoctor(entry.appointment, patientName(entry))}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <StatCard
                icon={Hourglass}
                label="Longest wait"
                value={longest ? `${longest.minutes}m` : "—"}
                hint={longest ? patientName(longest.entry) : "Nobody waiting"}
              />
              <StatCard
                icon={Timer}
                label="Average wait"
                value={waits.length ? `${averageWait}m` : "—"}
                hint={`${waits.length} in the waiting room`}
              />
              <StatCard
                icon={UserRoundCheck}
                label="Sent on to the doctor"
                value={String(sentOn)}
                hint="Triaged or skipped today"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof Timer; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground truncate">{hint}</p>
    </div>
  );
}
