import { Clock, Loader2, LogIn, Phone, Stethoscope } from "lucide-react";
import { Badge } from "@curo/web/ui/badge";
import { NextUpAction, NextUpCard } from "@curo/web/ui/next-up-card";
import { formatAgeSex } from "@curo/web/format";
import { LateBadge } from "./LateBadge";
import { ROUTES } from "@/lib/constants";
import { formatTime } from "@/lib/utils";
import type { Arrival } from "@/lib/queue";

interface Props {
  arrival: Arrival;
  pending: boolean;
  onCheckIn: () => void;
  /** Whoever else is still to arrive, under the patient. */
  footer?: React.ReactNode;
}

// The patient expected at the desk next, with the screen's only primary action.
export function NextArrivalCard({ arrival, pending, onCheckIn, footer }: Props) {
  const { appointment, patient, patientName, doctorName } = arrival;

  return (
    <NextUpCard
      label="Arriving next"
      badges={<LateBadge time={appointment.time} />}
      name={patientName}
      href={ROUTES.PATIENT(appointment.patientId)}
      action={
        <NextUpAction onClick={onCheckIn} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
          Check in
        </NextUpAction>
      }
      footer={footer}
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {patient && <span>{formatAgeSex(patient.dob, patient.sex)}</span>}
        {patient?.phone && (
          <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
            <Phone className="size-3.5" /> {patient.phone}
          </a>
        )}
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {formatTime(appointment.time)}</span>
        <span className="inline-flex items-center gap-1"><Stethoscope className="size-3.5" /> Dr. {doctorName}</span>
        {appointment.reason && <Badge variant="outline" className="font-normal">{appointment.reason}</Badge>}
      </p>
    </NextUpCard>
  );
}
