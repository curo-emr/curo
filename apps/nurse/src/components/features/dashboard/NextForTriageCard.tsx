import { Clock, Loader2, Play, RotateCcw, Stethoscope } from "lucide-react";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import { NextUpAction, NextUpCard, NextUpEmpty } from "@curo/web/ui/next-up-card";
import { toneClass, waitTone } from "@curo/web/ui/status-badge";
import type { QueueEntry } from "@/lib/hooks/useTodayQueue";
import { patientName } from "@/components/features/queue/QueueRow";
import { formatAgeSex } from "@curo/web/format";
import { cn, formatPhn, formatTime, minutesSince } from "@/lib/utils";

interface Props {
  entry: QueueEntry | null;
  pending: boolean;
  onOpen: () => void;
  onSkip: () => void;
  /** The rest of the waiting room, under the patient. */
  footer?: React.ReactNode;
}

// The one patient the nurse should take now, with the screen's only primary action.
export function NextForTriageCard({ entry, pending, onOpen, onSkip, footer }: Props) {
  if (!entry) {
    return <NextUpEmpty title="No one is waiting for triage" description="Patients appear here as soon as reception checks them in." />;
  }

  const { appointment, patient, doctor } = entry;
  const resuming = appointment.queueStage === "with_nurse";
  const minutes = minutesSince(appointment.stageSince);

  return (
    <NextUpCard
      label={resuming ? "Continue with" : "Next for triage"}
      badges={
        <Badge variant="outline" className={cn("font-mono tabular-nums", toneClass(waitTone(minutes)))}>
          {resuming ? `in triage ${minutes}m` : `waiting ${minutes}m`}
        </Badge>
      }
      name={patientName(entry)}
      action={
        <>
          {!resuming && (
            <Button variant="ghost" className="text-muted-foreground" onClick={onSkip} disabled={pending}>
              Skip to doctor
            </Button>
          )}
          <NextUpAction onClick={onOpen} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : resuming ? <RotateCcw /> : <Play />}
            {resuming ? "Resume triage" : "Start triage"}
          </NextUpAction>
        </>
      }
      footer={footer}
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {patient && <span>{formatAgeSex(patient.dob, patient.sex)}</span>}
        {patient?.phn && <span className="font-mono text-xs">PHN {formatPhn(patient.phn)}</span>}
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatTime(appointment.time)}</span>
        <span className="inline-flex items-center gap-1">
          <Stethoscope className="size-3.5" /> {doctor ? `Dr. ${doctor.name.full}` : "Doctor not assigned"}
        </span>
      </p>
    </NextUpCard>
  );
}
