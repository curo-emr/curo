import Link from "next/link";
import { Clock, Loader2, LogIn, Phone, Stethoscope } from "lucide-react";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import { Card } from "@curo/web/ui/card";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
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
  children?: React.ReactNode;
}

// The patient expected at the desk next, with the screen's only primary action.
export function NextArrivalCard({ arrival, pending, onCheckIn, children }: Props) {
  const { appointment, patient, patientName, doctorName } = arrival;

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <InitialsAvatar name={patientName} size="lg" className="bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/10" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Arriving next</span>
            <LateBadge time={appointment.time} />
          </div>
          <Link
            href={ROUTES.PATIENT(appointment.patientId)}
            className="truncate text-xl font-semibold tracking-tight text-foreground hover:text-primary"
          >
            {patientName}
          </Link>
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
        </div>
        <Button size="lg" className="h-11 shrink-0 px-6 text-base shadow-md shadow-primary/20" onClick={onCheckIn} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
          Check in
        </Button>
      </div>
      {children && <div className="border-t bg-card/60">{children}</div>}
    </Card>
  );
}
