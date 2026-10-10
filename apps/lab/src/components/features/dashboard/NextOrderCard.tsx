"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Coffee, FlaskConical } from "lucide-react";
import { formatAgeSex, formatRelative } from "@curo/web/format";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { Skeleton } from "@curo/web/ui/skeleton";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { PriorityBadge } from "@/components/features/orders/PriorityBadge";
import { ROUTES } from "@/lib/constants";
import { nextStep, orderNumber, orderStatus, STEP_ACTION } from "@/lib/orders";
import { patientQueries } from "@/lib/queries";
import type { LabOrder } from "@/types";

interface NextOrderCardProps {
  /** The most urgent order waiting on the lab: stat first, then the longest waiting. */
  next: LabOrder | undefined;
  /** How many orders are waiting, `next` included. */
  waiting: number;
}

// The order to work on next, with the screen's only primary action.
export function NextOrderCard({ next, waiting }: NextOrderCardProps) {
  const patient = useQuery({ ...patientQueries.detail(next?.patientId ?? ""), enabled: !!next });

  if (!next) {
    return (
      <Card>
        <EmptyState
          icon={Coffee}
          title="No orders waiting"
          description="Orders appear here as soon as a doctor sends them to your lab."
          className="py-8"
        />
      </Card>
    );
  }

  // A waiting order always has a next step; receiving comes first.
  const action = STEP_ACTION[nextStep(next) ?? "receive"];
  const others = waiting - 1;
  const name = patient.data?.name.full;

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/[0.07] via-card to-card">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <InitialsAvatar name={name ?? ""} size="lg" className="bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/10" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Next order</span>
            {next.priority !== "routine" && <PriorityBadge priority={next.priority} />}
            <StatusBadge status={orderStatus(next)} />
            <Badge variant="outline" className="font-normal text-muted-foreground">
              sent {formatRelative(next.sentToLabAt ?? next.createdAt)}
            </Badge>
          </div>
          {patient.isPending ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <p className="truncate text-xl font-semibold tracking-tight text-foreground">{name ?? "Unknown patient"}</p>
          )}
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            {patient.data && <span>{formatAgeSex(patient.data.dob, patient.data.sex)}</span>}
            {patient.data && <span className="font-mono text-xs">{patient.data.mrn}</span>}
            <span className="font-mono text-xs">Order {orderNumber(next)}</span>
          </p>
          <p className="flex items-start gap-1.5 text-sm text-foreground">
            <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span>{next.tests.map(t => t.name).join(", ")}</span>
          </p>
        </div>
        <Button asChild size="lg" className="h-11 shrink-0 px-6 text-base shadow-md shadow-primary/20">
          <Link href={action.href(next.id)}>
            {action.label} <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t bg-card/60 px-6 py-3 text-sm">
        <p className="text-muted-foreground">
          {others === 0 ? (
            "No other orders waiting."
          ) : (
            <>
              <span className="font-medium tabular-nums text-foreground">{others}</span> more{" "}
              {others === 1 ? "order" : "orders"} waiting
            </>
          )}
        </p>
        <Link href={ROUTES.WORKLIST} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Open worklist <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}
