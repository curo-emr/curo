"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, HeartPulse, Loader2, RefreshCw, SearchX, UserRoundCheck, X } from "lucide-react";
import type { QueueStage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Button } from "@curo/web/ui/button";
import { Badge } from "@curo/web/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueueRow, patientName } from "./QueueRow";
import { useTodayQueue, type QueueEntry } from "@/lib/hooks/useTodayQueue";
import { useTriageActions } from "@/lib/hooks/useTriageActions";
import { TRIAGE_STAGES, STAGE_META } from "@/lib/queue";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SECTIONS: { stage: QueueStage; title: string; empty: string }[] = [
  { stage: "with_nurse", title: "In triage", empty: "No one is being triaged right now." },
  { stage: "waiting_nurse", title: "Waiting", empty: "The waiting room is clear." },
  { stage: "ready_for_doctor", title: "Sent to the doctor", empty: "No one is waiting for the doctor." },
];

function matches(entry: QueueEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return patientName(entry).toLowerCase().includes(q) || (entry.patient?.phn ?? "").includes(q.replace(/\s/g, ""));
}

export function TriageQueue() {
  const query = useSearchParams().get("q")?.trim() ?? "";
  const { entries, status, updatedAt, refresh } = useTodayQueue(TRIAGE_STAGES);
  const { openTriage, skipToDoctor, pendingId } = useTriageActions(refresh);
  const [showSent, setShowSent] = useState(false);

  const visible = entries.filter(e => matches(e, query));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader title="Triage queue" description="Today's checked-in patients, oldest appointment first. Updates automatically.">
        {updatedAt && (
          <span className="text-xs text-muted-foreground">
            Updated {updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </PageHeader>

      {query && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Showing patients matching</span>
          <Badge variant="secondary" className="font-medium">{query}</Badge>
          <Link href={ROUTES.TRIAGE_QUEUE} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <X className="h-3 w-3" /> Clear
          </Link>
        </div>
      )}

      {status === "loading" ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : status === "error" ? (
        <Card className="shadow-sm border">
          <EmptyState icon={HeartPulse} title="The triage queue could not be loaded" description="Check your connection, then try again." actionLabel="Try again" onAction={refresh} />
        </Card>
      ) : query && visible.length === 0 ? (
        <Card className="shadow-sm border">
          <EmptyState icon={SearchX} title={`No one in today's queue matches "${query}"`} description="Search by first name, last name or PHN." actionLabel="Show everyone" actionHref={ROUTES.TRIAGE_QUEUE} />
        </Card>
      ) : (
        SECTIONS.map(({ stage, title, empty }) => {
          const items = visible.filter(e => e.appointment.queueStage === stage);
          const collapsible = stage === "ready_for_doctor";
          const open = !collapsible || showSent || Boolean(query);
          if (stage === "with_nurse" && items.length === 0) return null; // only show when someone is mid-triage

          return (
            <Card key={stage} className="shadow-sm border">
              <CardHeader className="bg-muted/50 border-b py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", STAGE_META[stage].color)} />
                  {title}
                  <Badge variant="secondary" className="font-mono tabular-nums">{items.length}</Badge>
                </CardTitle>
                {collapsible && !query && (
                  <Button variant="ghost" size="sm" onClick={() => setShowSent(v => !v)} aria-expanded={open}>
                    {open ? "Hide" : "Show"}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                  </Button>
                )}
              </CardHeader>
              {open && (
                <CardContent className="p-0 divide-y">
                  {items.length === 0 ? (
                    <p className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-muted-foreground">
                      <UserRoundCheck className="h-4 w-4" /> {empty}
                    </p>
                  ) : (
                    items.map(entry => (
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
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
