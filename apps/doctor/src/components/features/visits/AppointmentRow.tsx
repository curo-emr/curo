"use client";

import Link from "next/link";
import { ChevronRight, Play, RotateCcw } from "lucide-react";
import type { Appointment, Patient } from "@/types";
import { Button } from "@curo/web/ui/button";
import { PatientAvatar } from "@/components/ui/PatientAvatar";
import { QueueStageBadge } from "@/components/ui/QueueStageBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ROUTES } from "@/lib/constants";
import { cn, formatAgeSex, formatTime } from "@/lib/utils";
import { getVisitAction, isClosed } from "@/lib/visit";

interface Props {
  appointment: Appointment;
  patient?: Patient;
  hasDraft?: boolean;
  /** Hide the stage badge when the surrounding group already says it. */
  showStage?: boolean;
}

// One appointment in a list: time, patient, reason, where they are, and the single next action.
export function AppointmentRow({ appointment: a, patient, hasDraft = false, showStage = true }: Props) {
  const action = getVisitAction(a, hasDraft);
  const closed = isClosed(a);
  const name = patient?.name.full ?? "Loading…";

  return (
    <div className={cn("group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40", closed && "opacity-70")}>
      <div className="w-16 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">{formatTime(a.time)}</div>
      <PatientAvatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={ROUTES.PATIENT(a.patientId)} className="truncate font-medium text-foreground hover:text-primary hover:underline underline-offset-4">
            {name}
          </Link>
          {patient && <span className="text-xs text-muted-foreground">{formatAgeSex(patient.dob, patient.sex)}</span>}
          {hasDraft && !closed && (
            <span className="rounded-full bg-status-warning-bg px-1.5 py-px text-[11px] font-medium text-status-warning-text">Draft</span>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">{a.reason || a.visitType}</p>
      </div>
      <div className="hidden sm:block shrink-0">
        {closed ? <StatusBadge status={a.status === "arrived" ? "completed" : a.status} /> : showStage && <QueueStageBadge stage={a.queueStage} />}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {action ? (
          <Button asChild size="sm" variant={action.kind === "resume" ? "default" : "outline"} className="min-w-[7.5rem]">
            <Link href={action.href}>
              {action.kind === "resume" ? <RotateCcw /> : <Play />}
              {action.label}
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
            <Link href={ROUTES.PATIENT(a.patientId)}>
              Chart <ChevronRight />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
