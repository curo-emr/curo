"use client";

import Link from "next/link";
import { Clock, Coffee, Play, RotateCcw } from "lucide-react";
import type { Appointment, Patient } from "@/types";
import { Button } from "@curo/web/ui/button";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
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

// The one patient the doctor should see now, with the screen's only primary action.
export function UpNextCard({ appointment, patient, hasDraft, nextUpcoming }: Props) {
  if (!appointment) {
    return (
      <Card>
        <EmptyState
          icon={Coffee}
          title="No one is waiting for you"
          description={nextUpcoming ? `Next appointment at ${formatTime(nextUpcoming.time)}.` : "Patients appear here once they're checked in."}
          className="py-8"
        />
      </Card>
    );
  }

  const action = getVisitAction(appointment, hasDraft) as VisitAction;
  const name = patient?.name.full ?? "";

  return (
    <Card className="relative gap-0 border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <PatientAvatar name={name} size="xl" className="bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/10" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {action.kind === "resume" ? "Continue with" : "Up next"}
            </span>
            <QueueStageBadge stage={appointment.queueStage} />
          </div>
          <Link href={ROUTES.PATIENT(appointment.patientId)} className="truncate text-xl font-semibold tracking-tight text-foreground hover:text-primary">
            {name || "Loading…"}
          </Link>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {patient && <span>{formatAgeSex(patient.dob, patient.sex)}</span>}
            {patient && <span className="font-mono text-xs">{patient.mrn}</span>}
            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatTime(appointment.time)}</span>
          </p>
          {appointment.reason && <p className="text-sm text-foreground">{appointment.reason}</p>}
          <AllergyChips patientId={appointment.patientId} className="pt-1" />
        </div>
        <Button asChild size="lg" className="h-11 shrink-0 px-6 text-base shadow-md shadow-primary/20">
          <Link href={action.href}>
            {action.kind === "resume" ? <RotateCcw /> : <Play />}
            {action.label}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
