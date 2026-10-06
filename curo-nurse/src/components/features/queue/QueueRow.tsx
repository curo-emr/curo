import { ArrowRight, Clock, Loader2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateAge, cn, formatPhn, formatTime, minutesSince } from "@/lib/utils";
import { waitBadgeClass } from "@/lib/queue";
import type { QueueEntry } from "@/lib/hooks/useTodayQueue";
import { PatientAvatar } from "./PatientAvatar";

interface QueueRowProps {
  entry: QueueEntry;
  pending: boolean;
  onOpen: () => void;
  onSkip?: () => void;
}

// What the row's main button does at each stage the nurse works with.
const PRIMARY_ACTION = {
  waiting_nurse: "Start triage",
  with_nurse: "Resume triage",
  ready_for_doctor: "Edit vitals",
} as const;

export function patientName(entry: QueueEntry): string {
  return entry.patient?.name.full ?? "Unknown patient";
}

export function QueueRow({ entry, pending, onOpen, onSkip }: QueueRowProps) {
  const { appointment, patient, doctor } = entry;
  const stage = appointment.queueStage as keyof typeof PRIMARY_ACTION;
  const minutes = minutesSince(appointment.stageSince);
  const isWaiting = stage === "waiting_nurse";
  const sent = stage === "ready_for_doctor";

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center hover:bg-muted/40 transition-colors">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <PatientAvatar name={patientName(entry)} />
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{patientName(entry)}</p>
          <p className="text-xs text-muted-foreground truncate capitalize">
            {patient ? `${calculateAge(patient.dob)}y · ${patient.sex} · ` : ""}
            {patient?.phn ? <span className="font-mono">PHN {formatPhn(patient.phn)}</span> : "No PHN"}
          </p>
        </div>
      </div>

      <div className="min-w-0 sm:w-56 text-xs text-muted-foreground space-y-0.5">
        <p className="flex items-center gap-1.5 truncate text-foreground/80">
          <Stethoscope className="h-3.5 w-3.5 shrink-0" />
          {doctor ? `Dr. ${doctor.name.full}` : "Doctor not assigned"}
        </p>
        <p className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {formatTime(appointment.time)} appointment
        </p>
      </div>

      <div className="flex items-center gap-2 sm:w-[19rem] sm:justify-end">
        <Badge
          variant="outline"
          className={cn("font-mono tabular-nums", sent ? "bg-muted text-muted-foreground border-border" : waitBadgeClass(minutes))}
          title={sent ? "Time since vitals were sent" : "Time waiting in this stage"}
        >
          {sent ? `sent ${minutes}m ago` : `${minutes}m`}
        </Badge>
        {isWaiting && onSkip && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onSkip} disabled={pending}>
            Skip to doctor
          </Button>
        )}
        <Button size="sm" variant={sent ? "outline" : "default"} onClick={onOpen} disabled={pending} className="min-w-32">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {PRIMARY_ACTION[stage] ?? "Open"}
          {!pending && !sent && <ArrowRight className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
