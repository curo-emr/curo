"use client";

import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import type { Appointment, Patient } from "@/types";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppointmentRow } from "@/components/features/visits/AppointmentRow";
import { cn } from "@/lib/utils";
import { QUEUE_GROUPS, getQueueGroup, type QueueGroup } from "@/lib/visit";

interface Props {
  appointments: Appointment[];
  patients: Record<string, Patient>;
  draftIds: Set<string>;
}

// Today's list, grouped by where each patient is in the flow (the order the doctor works in).
export function QueueList({ appointments, patients, draftIds }: Props) {
  const [showDone, setShowDone] = useState(false);

  if (appointments.length === 0) {
    return (
      <Card>
        <EmptyState icon={Users} title="No appointments today" description="Your schedule for today is empty." />
      </Card>
    );
  }

  const byGroup = (g: QueueGroup) => appointments.filter(a => getQueueGroup(a) === g);

  return (
    <Card className="gap-0 py-0">
      {QUEUE_GROUPS.map(({ id, label }) => {
        const items = byGroup(id);
        if (items.length === 0) return null;
        const collapsible = id === "done";
        const open = !collapsible || showDone;
        return (
          <section key={id} className="border-b last:border-0">
            <button
              type="button"
              disabled={!collapsible}
              onClick={() => setShowDone(s => !s)}
              className="flex w-full items-center gap-2 bg-muted/40 px-5 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground enabled:hover:text-foreground"
            >
              {label}
              <span className="tabular-nums font-medium normal-case tracking-normal">· {items.length}</span>
              {collapsible && <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", open && "rotate-180")} />}
            </button>
            {open && (
              <div className="divide-y">
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
    </Card>
  );
}
