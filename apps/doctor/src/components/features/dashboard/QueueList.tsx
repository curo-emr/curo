"use client";

import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import type { Appointment, Patient } from "@/types";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { toneDotClass } from "@curo/web/ui/status-badge";
import { AppointmentRow } from "@/components/features/visits/AppointmentRow";
import { cn } from "@/lib/utils";
import { QUEUE_GROUPS, getQueueGroup } from "@/lib/visit";

interface Props {
  appointments: Appointment[];
  patients: Record<string, Patient>;
  draftIds: Set<string>;
  /** The patient already shown as "Up next", left out here so no one is listed twice. */
  upNextId?: string;
}

// The rest of today, grouped by where each patient is in the flow (the order the doctor works in).
export function QueueList({ appointments, patients, draftIds, upNextId }: Props) {
  const [showDone, setShowDone] = useState(false);
  const rest = appointments.filter(a => a.id !== upNextId);

  if (appointments.length === 0) {
    return (
      <Card>
        <EmptyState icon={Users} title="No appointments today" description="Your schedule for today is empty." />
      </Card>
    );
  }
  if (rest.length === 0) return null;

  return (
    <Card className="gap-0 py-0">
      <h2 className="px-5 pt-4 pb-1 text-sm font-semibold text-foreground">{upNextId ? "Rest of today" : "Today's patients"}</h2>
      {QUEUE_GROUPS.map(({ id, label, tone }) => {
        const items = rest.filter(a => getQueueGroup(a) === id);
        if (items.length === 0) return null;
        const collapsible = id === "done";
        const open = !collapsible || showDone;
        return (
          <section key={id} aria-label={label}>
            <button
              type="button"
              disabled={!collapsible}
              aria-expanded={collapsible ? open : undefined}
              onClick={() => setShowDone(s => !s)}
              className="flex w-full items-center gap-2 px-5 pt-4 pb-2 text-left text-xs font-medium text-muted-foreground enabled:hover:text-foreground"
            >
              <span className={cn("size-2 rounded-full", toneDotClass(tone))} />
              {label}
              <span className="tabular-nums">{items.length}</span>
              {collapsible && <ChevronDown className={cn("ml-auto size-4 transition-transform", open && "rotate-180")} />}
            </button>
            {open && (
              <div className="divide-y border-y">
                {items.map(a => (
                  <AppointmentRow
                    key={a.id}
                    appointment={a}
                    patient={patients[a.patientId]}
                    hasDraft={draftIds.has(a.id)}
                    showStage={id === "triage"}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
      <div className="h-2" />
    </Card>
  );
}
