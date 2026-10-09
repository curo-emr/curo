"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoadError } from "@curo/web/ui/load-error";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@curo/web/ui/page-header";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { DayOverview } from "@/components/features/dashboard/DayOverview";
import { UpNextCard } from "@/components/features/dashboard/UpNextCard";
import { QueueList } from "@/components/features/dashboard/QueueList";
import { NeedsAttention } from "@/components/features/dashboard/NeedsAttention";
import { appointmentQueries, labResultQueries, patientQueries } from "@/lib/queries";
import { getTodayString } from "@/lib/utils";
import { getQueueGroup, hasDraft, isMissed, visitDraftKey } from "@/lib/visit";
import type { Appointment, LabOrder } from "@/types";

// One empty list for "not loaded yet", so the memo below doesn't recompute on every render.
const NONE: never[] = [];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function TodayPage() {
  const { user } = useAuth();
  const practitionerId = user?.practitionerId;

  const today = useQuery(appointmentQueries.day(getTodayString()));
  const labs = useQuery(labResultQueries.recent(practitionerId));
  const appointments: Appointment[] = today.data ?? NONE;
  const labOrders: LabOrder[] = labs.data ?? NONE;
  // One lookup names everyone on the queue and in the lab results.
  const patients = useQuery(patientQueries.byIds([...appointments, ...labOrders].map(x => x.patientId))).data ?? {};

  // Appointments with an autosaved, unsigned visit in this browser.
  const draftIds = useMemo(
    () => new Set(user ? appointments.filter(a => hasDraft(visitDraftKey(user.id, a.patientId, a.id))).map(a => a.id) : []),
    [appointments, user],
  );

  if (!today.data) {
    return today.isError
      ? <LoadError what="today's appointments" onRetry={() => void today.refetch()} retrying={today.isFetching} className="min-h-[50vh]" />
      : <PageSkeleton />;
  }

  const upNext = appointments.find(a => getQueueGroup(a) === "consultation") ?? appointments.find(a => getQueueGroup(a) === "ready") ?? null;
  const nextUpcoming = appointments.find(a => getQueueGroup(a) === "upcoming") ?? null;
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}${user?.firstName ? `, Dr. ${user.firstName}` : ""}`}
        description={`${dateLabel} · ${appointments.length} appointment${appointments.length === 1 ? "" : "s"} today`}
      />

      {appointments.some(a => !isMissed(a)) && <DayOverview appointments={appointments} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <UpNextCard
            appointment={upNext}
            patient={upNext ? patients[upNext.patientId] : undefined}
            hasDraft={!!upNext && draftIds.has(upNext.id)}
            nextUpcoming={nextUpcoming}
          />
          <QueueList appointments={appointments} patients={patients} draftIds={draftIds} upNextId={upNext?.id} />
        </div>
        <NeedsAttention practitionerId={practitionerId} patients={patients} />
      </div>
    </div>
  );
}
