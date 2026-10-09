import { Clock, Coffee, Loader2, Play, RotateCcw, Stethoscope } from "lucide-react";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { toneClass, waitTone } from "@curo/web/ui/status-badge";
import type { QueueEntry } from "@/lib/hooks/useTodayQueue";
import { PatientAvatar } from "@/components/features/queue/PatientAvatar";
import { patientName } from "@/components/features/queue/QueueRow";
import { calculateAge, cn, formatPhn, formatTime, minutesSince } from "@/lib/utils";

interface Props {
  entry: QueueEntry | null;
  pending: boolean;
  onOpen: () => void;
  onSkip: () => void;
  /** The rest of the waiting room, under the patient. */
  children?: React.ReactNode;
}

// The one patient the nurse should take now, with the screen's only primary action.
export function NextForTriageCard({ entry, pending, onOpen, onSkip, children }: Props) {
  if (!entry) {
    return (
      <Card>
        <EmptyState
          icon={Coffee}
          title="No one is waiting for triage"
          description="Patients appear here as soon as reception checks them in."
          className="py-8"
        />
      </Card>
    );
  }

  const { appointment, patient, doctor } = entry;
  const resuming = appointment.queueStage === "with_nurse";
  const minutes = minutesSince(appointment.stageSince);
  const name = patientName(entry);

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <PatientAvatar name={name} className="size-14 bg-primary text-lg text-primary-foreground shadow-sm ring-4 ring-primary/10" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {resuming ? "Continue with" : "Next for triage"}
            </span>
            <Badge variant="outline" className={cn("font-mono tabular-nums", toneClass(waitTone(minutes)))}>
              {resuming ? `in triage ${minutes}m` : `waiting ${minutes}m`}
            </Badge>
          </div>
          <p className="truncate text-xl font-semibold tracking-tight text-foreground">{name}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {patient && <span>{calculateAge(patient.dob)}y · <span className="capitalize">{patient.sex}</span></span>}
            {patient?.phn && <span className="font-mono text-xs">PHN {formatPhn(patient.phn)}</span>}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatTime(appointment.time)}</span>
            <span className="inline-flex items-center gap-1">
              <Stethoscope className="size-3.5" /> {doctor ? `Dr. ${doctor.name.full}` : "Doctor not assigned"}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:items-center">
          {!resuming && (
            <Button variant="ghost" className="text-muted-foreground" onClick={onSkip} disabled={pending}>
              Skip to doctor
            </Button>
          )}
          <Button size="lg" className="h-11 px-6 text-base shadow-md shadow-primary/20" onClick={onOpen} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : resuming ? <RotateCcw /> : <Play />}
            {resuming ? "Resume triage" : "Start triage"}
          </Button>
        </div>
      </div>
      {children && <div className="border-t bg-card/60 px-6 py-3">{children}</div>}
    </Card>
  );
}
