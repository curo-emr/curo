import { AlertTriangle, Clock, Stethoscope } from "lucide-react";
import type { Allergy, Appointment, Patient, Problem } from "@/types";
import type { Practitioner } from "@/lib/api/practitioners";
import { Badge } from "@/components/ui/badge";
import { PatientAvatar } from "@/components/features/queue/PatientAvatar";
import { calculateAge, cn, formatPhn, formatTime } from "@/lib/utils";

interface PatientBannerProps {
  patient: Patient;
  appointment: Appointment;
  doctor?: Practitioner;
  allergies: Allergy[] | null;   // null = could not be loaded
  conditions: Problem[] | null;
}

const ALLERGY_CLASSES: Record<Allergy["severity"], string> = {
  severe: "bg-status-error-bg text-status-error-text border-status-error-border",
  moderate: "bg-status-warning-bg text-status-warning-text border-status-warning-border",
  mild: "bg-status-warning-bg text-status-warning-text border-status-warning-border",
};

// Who is being triaged, for which visit, and what to be careful about.
export function PatientBanner({ patient, appointment, doctor, allergies, conditions }: PatientBannerProps) {
  const activeConditions = conditions?.filter(c => c.status === "active") ?? null;
  const hasSevereAllergy = allergies?.some(a => a.severity === "severe") ?? false;

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <PatientAvatar name={patient.name.full} className="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{patient.name.full}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {patient.sex} · {calculateAge(patient.dob)} years
            {patient.phn && <> · <span className="font-mono normal-case">PHN {formatPhn(patient.phn)}</span></>}
            {patient.bloodType && <> · Blood {patient.bloodType}</>}
          </p>
        </div>
        <div className="space-y-1 text-sm sm:text-right">
          <p className="flex items-center gap-1.5 font-medium text-foreground sm:justify-end">
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
            {doctor ? `Dr. ${doctor.name.full}` : "Doctor not assigned"}
          </p>
          <p className="flex items-center gap-1.5 text-muted-foreground sm:justify-end">
            <Clock className="h-4 w-4" />
            {formatTime(appointment.time)}{appointment.reason && ` · ${appointment.reason}`}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-3 border-t px-5 py-3.5 sm:grid-cols-[auto_1fr] sm:items-center",
          hasSevereAllergy && "bg-status-error-bg/50",
        )}
      >
        <p className={cn(
          "flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]",
          allergies?.length ? "text-status-error-text" : "text-muted-foreground",
        )}>
          <AlertTriangle className="h-3.5 w-3.5" /> Allergies
        </p>
        <div className="flex flex-wrap gap-1.5">
          {allergies === null ? (
            <span className="text-sm text-status-warning-text">Allergies could not be loaded — confirm with the patient.</span>
          ) : allergies.length === 0 ? (
            <span className="text-sm text-muted-foreground">No known allergies</span>
          ) : (
            allergies.map(a => (
              <Badge key={a.id} variant="outline" className={ALLERGY_CLASSES[a.severity]} title={a.reaction || undefined}>
                {a.substance}
                <span className="opacity-70 font-normal">· {a.severity}</span>
              </Badge>
            ))
          )}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Conditions</p>
        <div className="flex flex-wrap gap-1.5">
          {activeConditions === null ? (
            <span className="text-sm text-muted-foreground">Conditions could not be loaded.</span>
          ) : activeConditions.length === 0 ? (
            <span className="text-sm text-muted-foreground">None recorded</span>
          ) : (
            activeConditions.map(c => (
              <Badge key={c.id} variant="outline" className="bg-status-info-bg text-status-info-text border-status-info-border">
                {c.name}
              </Badge>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
