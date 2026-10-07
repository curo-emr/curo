"use client";

import Link from "next/link";
import { AlertTriangle, Droplet, Pencil, Phone, Play, RotateCcw, ShieldCheck, Contact } from "lucide-react";
import type { Allergy, Appointment, Patient } from "@/types";
import { Button } from "@curo/web/ui/button";
import { Card } from "@curo/web/ui/card";
import { PatientAvatar } from "@/components/ui/PatientAvatar";
import { QueueStageBadge } from "@/components/ui/QueueStageBadge";
import { Popover, PopoverContent, PopoverTrigger } from "@curo/web/ui/popover";
import { ROUTES } from "@/lib/constants";
import { formatAgeSex, formatDate, formatTime } from "@/lib/utils";
import { getVisitAction, visitHref } from "@/lib/visit";

interface PatientHeaderProps {
  patient: Patient;
  allergies: Allergy[];
  /** The patient's open appointment today, if any. */
  todaysAppointment: Appointment | null;
  hasDraft: boolean;
}

export function PatientHeader({ patient, allergies, todaysAppointment, hasDraft }: PatientHeaderProps) {
  // Today's appointment decides start vs resume; without one the doctor can still see a walk-in.
  const action = (todaysAppointment && getVisitAction(todaysAppointment, hasDraft)) ?? {
    kind: hasDraft ? "resume" : "start",
    label: hasDraft ? "Resume visit" : "Start visit",
    href: visitHref(patient.id, todaysAppointment?.id),
  };

  return (
    <Card className="gap-0">
      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-start">
        <PatientAvatar name={patient.name.full} size="xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{patient.name.full}</h1>
            {todaysAppointment && <QueueStageBadge stage={todaysAppointment.queueStage} />}
          </div>
          <dl className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            <Meta label="Age / sex">{formatAgeSex(patient.dob, patient.sex)} <span className="text-muted-foreground/70">({formatDate(patient.dob)})</span></Meta>
            <Meta label="MRN"><span className="text-xs">MRN</span> <span className="font-mono text-xs text-foreground">{patient.mrn}</span></Meta>
            {patient.phn && <Meta label="PHN"><span className="text-xs">PHN</span> <span className="font-mono text-xs text-foreground">{patient.phn}</span></Meta>}
            {patient.bloodType && <Meta label="Blood"><Droplet className="inline h-3.5 w-3.5 text-status-error-text" /> {patient.bloodType}</Meta>}
            {patient.phone && <Meta label="Phone"><Phone className="inline h-3.5 w-3.5" /> {patient.phone}</Meta>}
          </dl>
          {allergies.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-status-error-text">
                <AlertTriangle className="h-3.5 w-3.5" /> Allergies
              </span>
              {allergies.map(a => (
                <span key={a.id} className="rounded-full border border-status-error-border bg-status-error-bg px-2 py-px text-xs font-medium text-status-error-text">
                  {a.substance}{a.reaction ? ` · ${a.reaction}` : ""}
                </span>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> No known allergies</p>
          )}
          {patient.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {patient.tags.map(tag => <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>)}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {patient.emergencyContact?.name && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Emergency contact" className="text-muted-foreground"><Contact /></Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Emergency contact</p>
                <p className="mt-1 font-medium text-foreground">{patient.emergencyContact.name}</p>
                <p className="text-muted-foreground">{patient.emergencyContact.relationship}</p>
                <p className="mt-1 text-foreground">{patient.emergencyContact.phone}</p>
              </PopoverContent>
            </Popover>
          )}
          <Button asChild variant="outline">
            <Link href={ROUTES.EDIT_PATIENT(patient.id)}><Pencil /> Edit details</Link>
          </Button>
          <Button asChild className="shadow-sm">
            <Link href={action.href}>
              {action.kind === "resume" ? <RotateCcw /> : <Play />}
              {action.label}
              {todaysAppointment && action.kind === "start" && <span className="font-normal opacity-80">· {formatTime(todaysAppointment.time)}</span>}
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="sr-only">{label}</dt>
      <dd className="flex items-center gap-1">{children}</dd>
    </div>
  );
}
