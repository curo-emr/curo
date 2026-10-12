"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FlaskConical } from "lucide-react";
import { formatAgeSex, formatRelative } from "@curo/web/format";
import { Badge } from "@curo/web/ui/badge";
import { NextUpAction, NextUpCard, NextUpEmpty, NextUpSummary } from "@curo/web/ui/next-up-card";
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
    return <NextUpEmpty title="No orders waiting" description="Orders appear here as soon as a doctor sends them to your lab." />;
  }

  // A waiting order always has a next step; receiving comes first.
  const action = STEP_ACTION[nextStep(next) ?? "receive"];
  const others = waiting - 1;

  return (
    <NextUpCard
      label="Next order"
      badges={
        <>
          {next.priority !== "routine" && <PriorityBadge priority={next.priority} />}
          <StatusBadge status={orderStatus(next)} />
          <Badge variant="outline" className="font-normal text-muted-foreground">
            sent {formatRelative(next.sentToLabAt ?? next.createdAt)}
          </Badge>
        </>
      }
      name={patient.isPending ? undefined : (patient.data?.name.full ?? "Unknown patient")}
      action={
        <NextUpAction asChild>
          <Link href={action.href(next.id)}>
            {action.label} <ArrowRight />
          </Link>
        </NextUpAction>
      }
      footer={
        <NextUpSummary href={ROUTES.WORKLIST} linkLabel="Open worklist">
          {others === 0 ? "No other orders waiting." : <><b>{others}</b> more {others === 1 ? "order" : "orders"} waiting</>}
        </NextUpSummary>
      }
    >
      <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
        {patient.data && <span>{formatAgeSex(patient.data.dob, patient.data.sex)}</span>}
        {patient.data && <span className="font-mono text-xs">{patient.data.mrn}</span>}
        <span className="font-mono text-xs">Order {orderNumber(next)}</span>
      </p>
      <p className="flex items-start gap-1.5 text-sm text-foreground">
        <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <span>{next.tests.map(t => t.name).join(", ")}</span>
      </p>
    </NextUpCard>
  );
}
