"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Coffee, Pill } from "lucide-react";
import { formatAgeSex, formatRelative } from "@curo/web/format";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { Skeleton } from "@curo/web/ui/skeleton";
import { ROUTES } from "@/lib/constants";
import { medicineName, type WaitingPatient } from "@/lib/prescriptions";
import { patientQueries } from "@/lib/queries";

// The patient who has waited longest for their medicines, with the screen's only primary action.
// Someone at the counter is found with ⌘K or on the prescriptions list instead.
export function NextToDispenseCard({ waiting }: { waiting: WaitingPatient[] }) {
  const [next, ...others] = waiting;
  const patient = useQuery({ ...patientQueries.detail(next?.patientId ?? ""), enabled: !!next });

  if (!next) {
    return (
      <Card>
        <EmptyState
          icon={Coffee}
          title="No prescriptions waiting"
          description="Prescriptions appear here as soon as a doctor signs the visit."
          className="py-8"
        />
      </Card>
    );
  }

  const { prescriptions } = next;
  const name = patient.data?.name.full;

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <InitialsAvatar name={name ?? ""} size="lg" className="bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/10" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Next to dispense</span>
            <Badge variant="outline" className="font-normal text-muted-foreground">sent {formatRelative(next.since)}</Badge>
          </div>
          {patient.isPending ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <p className="truncate text-xl font-semibold tracking-tight text-foreground">{name ?? "Unknown patient"}</p>
          )}
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
        </div>
        <Button asChild size="lg" className="h-11 shrink-0 px-6 text-base shadow-md shadow-primary/20">
          <Link href={ROUTES.PRESCRIPTION(prescriptions[0].id)}>
            Start dispensing <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t bg-card/60 px-6 py-3 text-sm">
        <p className="text-muted-foreground">
          {others.length === 0 ? (
            "No one else is waiting."
          ) : (
            <>
              <span className="font-medium tabular-nums text-foreground">{others.length}</span> more{" "}
              {others.length === 1 ? "patient" : "patients"} waiting
            </>
          )}
        </p>
        <Link href={ROUTES.PRESCRIPTIONS} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          All prescriptions <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}
