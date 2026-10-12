"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Pill } from "lucide-react";
import { formatAgeSex, formatRelative } from "@curo/web/format";
import { Badge } from "@curo/web/ui/badge";
import { NextUpAction, NextUpCard, NextUpEmpty, NextUpSummary } from "@curo/web/ui/next-up-card";
import { ROUTES } from "@/lib/constants";
import { medicineName, type WaitingPatient } from "@/lib/prescriptions";
import { patientQueries } from "@/lib/queries";

// The patient who has waited longest for their medicines, with the screen's only primary action.
// Someone at the counter is found with ⌘K or on the prescriptions list instead.
export function NextToDispenseCard({ waiting }: { waiting: WaitingPatient[] }) {
  const [next, ...others] = waiting;
  const patient = useQuery({ ...patientQueries.detail(next?.patientId ?? ""), enabled: !!next });

  if (!next) {
    return <NextUpEmpty title="No prescriptions waiting" description="Prescriptions appear here as soon as a doctor signs the visit." />;
  }

  const { prescriptions } = next;

  return (
    <NextUpCard
      label="Next to dispense"
      badges={<Badge variant="outline" className="font-normal text-muted-foreground">sent {formatRelative(next.since)}</Badge>}
      name={patient.isPending ? undefined : (patient.data?.name.full ?? "Unknown patient")}
      action={
        <NextUpAction asChild>
          <Link href={ROUTES.PRESCRIPTION(prescriptions[0].id)}>
            Start dispensing <ArrowRight />
          </Link>
        </NextUpAction>
      }
      footer={
        <NextUpSummary href={ROUTES.PRESCRIPTIONS} linkLabel="All prescriptions">
          {others.length === 0 ? (
            "No one else is waiting."
          ) : (
            <><b>{others.length}</b> more {others.length === 1 ? "patient" : "patients"} waiting</>
          )}
        </NextUpSummary>
      }
    >
      {patient.data && (
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
          <span>{formatAgeSex(patient.data.dob, patient.data.sex)}</span>
          <span className="font-mono text-xs">{patient.data.mrn}</span>
        </p>
      )}
      <p className="flex items-start gap-1.5 text-sm text-foreground">
        <Pill className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <span>
          {prescriptions.length > 1 && <span className="font-medium">{prescriptions.length} medicines: </span>}
          {prescriptions.map(medicineName).join(", ")}
        </span>
      </p>
    </NextUpCard>
  );
}
