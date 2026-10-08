"use client";

import Link from "next/link";
import { Clock, Coffee, Play, RotateCcw } from "lucide-react";
import type { Appointment, Patient } from "@/types";
import { Button } from "@curo/web/ui/button";
import { Card } from "@curo/web/ui/card";
import { PatientAvatar } from "@/components/ui/PatientAvatar";
import { QueueStageBadge } from "@/components/ui/QueueStageBadge";
import { AllergyChips } from "@/components/features/patients/AllergyChips";
import { ROUTES } from "@/lib/constants";
import { formatAgeSex, formatTime } from "@/lib/utils";
import { getVisitAction, type VisitAction } from "@/lib/visit";

interface Props {
  appointment: Appointment | null;
  patient?: Patient;
  hasDraft: boolean;
  nextUpcoming: Appointment | null;
}

// The one patient the doctor should see now, with the action front and centre.
export function UpNextCard({ appointment, patient, hasDraft, nextUpcoming }: Props) {
  if (!appointment) {
    return (
      <Card className="flex-row items-center gap-4 p-6">
        <div className="rounded-full bg-muted p-3"><Coffee className="h-5 w-5 text-muted-foreground" /></div>
        <div>
          <p className="font-medium text-foreground">No one is waiting for you</p>
          <p className="text-sm text-muted-foreground">
            {nextUpcoming ? `Next appointment at ${formatTime(nextUpcoming.time)}.` : "Patients appear here once they're checked in."}
          </p>
        </div>
      </Card>
    );
  }

  const action = getVisitAction(appointment, hasDraft) as VisitAction;
  const name = patient?.name.full ?? "";

  return (
    <Card className="relative gap-0 overflow-hidden border-primary/20">
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <PatientAvatar name={name} size="xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {action.kind === "resume" ? "Continue with" : "Up next"}
            </span>
            <QueueStageBadge stage={appointment.queueStage} />
          </div>
          <Link href={ROUTES.PATIENT(appointment.patientId)} className="block truncate text-xl font-semibold text-foreground hover:text-primary">
            {name || "Loading…"}
          </Link>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {patient && <span>{formatAgeSex(patient.dob, patient.sex)}</span>}
            {patient && <span className="font-mono text-xs">{patient.mrn}</span>}
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatTime(appointment.time)}</span>
          </p>
          {appointment.reason && <p className="text-sm text-foreground">{appointment.reason}</p>}
          <AllergyChips patientId={appointment.patientId} className="pt-1" />
        </div>
        <Button asChild size="lg" className="shrink-0 h-11 px-6 text-base shadow-sm">
          <Link href={action.href}>
            {action.kind === "resume" ? <RotateCcw /> : <Play />}
            {action.label}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
