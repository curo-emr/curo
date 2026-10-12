"use client";

import Link from "next/link";
import { Clock, Play, RotateCcw } from "lucide-react";
import type { Appointment, Patient } from "@/types";
import { NextUpAction, NextUpCard, NextUpEmpty } from "@curo/web/ui/next-up-card";
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
      <NextUpEmpty
        title="No one is waiting for you"
        description={nextUpcoming ? `Next appointment at ${formatTime(nextUpcoming.time)}.` : "Patients appear here once they're checked in."}
      />
    );
  }

  const action = getVisitAction(appointment, hasDraft) as VisitAction;

  return (
    <NextUpCard
      label={action.kind === "resume" ? "Continue with" : "Up next"}
      badges={<QueueStageBadge stage={appointment.queueStage} />}
      name={patient?.name.full}
      href={ROUTES.PATIENT(appointment.patientId)}
      action={
        <NextUpAction asChild>
          <Link href={action.href}>
            {action.kind === "resume" ? <RotateCcw /> : <Play />}
            {action.label}
          </Link>
        </NextUpAction>
      }
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {patient && <span>{formatAgeSex(patient.dob, patient.sex)}</span>}
        {patient && <span className="font-mono text-xs">{patient.mrn}</span>}
        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatTime(appointment.time)}</span>
      </p>
      {appointment.reason && <p className="text-sm text-foreground">{appointment.reason}</p>}
      <AllergyChips patientId={appointment.patientId} className="pt-1" />
    </NextUpCard>
  );
}
