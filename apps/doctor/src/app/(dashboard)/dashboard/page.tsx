"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@curo/web/ui/page-header";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { UpNextCard } from "@/components/features/dashboard/UpNextCard";
import { QueueList } from "@/components/features/dashboard/QueueList";
import { NeedsAttention } from "@/components/features/dashboard/NeedsAttention";
import { getAppointments } from "@/lib/api/appointments";
import { getOpenTasks } from "@/lib/api/tasks";
import { getRecentLabResults } from "@/lib/api/clinical";
import { getPatientsByIds } from "@/lib/api/patients";
import { getTodayString } from "@/lib/utils";
import { QUEUE_GROUPS, getQueueGroup, hasDraft, visitDraftKey, type QueueGroup } from "@/lib/visit";
import type { Appointment, LabOrder, Patient, Task } from "@/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function TodayPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Record<string, Patient>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const practitionerId = user?.practitionerId;

  useEffect(() => {
    const today = getTodayString();
    Promise.all([
      getAppointments({ date: today }),
      getOpenTasks().catch(() => [] as Task[]),
      practitionerId ? getRecentLabResults(practitionerId).catch(() => [] as LabOrder[]) : Promise.resolve([]),
    ])
      .then(async ([appts, openTasks, labs]) => {
        const todays = appts.filter(a => a.date === today).sort((a, b) => a.time.localeCompare(b.time));
        setAppointments(todays);
        setTasks(openTasks);
        setLabOrders(labs);
        setPatients(await getPatientsByIds([...todays.map(a => a.patientId), ...labs.map(l => l.patientId)]));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [practitionerId]);

  // Appointments with an autosaved, unsigned visit in this browser.
  const draftIds = useMemo(
    () => new Set(user ? appointments.filter(a => hasDraft(visitDraftKey(user.id, a.patientId, a.id))).map(a => a.id) : []),
    [appointments, user],
  );

  if (isLoading) return <PageSkeleton />;

  const count = (g: QueueGroup) => appointments.filter(a => getQueueGroup(a) === g).length;
  const upNext = appointments.find(a => getQueueGroup(a) === "consultation") ?? appointments.find(a => getQueueGroup(a) === "ready") ?? null;
  const nextUpcoming = appointments.find(a => getQueueGroup(a) === "upcoming") ?? null;
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}${user?.firstName ? `, Dr. ${user.firstName}` : ""}`}
        description={`${dateLabel} · ${appointments.length} appointment${appointments.length === 1 ? "" : "s"} today`}
      />

      <div className="flex flex-wrap gap-2">
        {QUEUE_GROUPS.map(({ id, label }) => (
          <div key={id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm shadow-xs">
            <span className="font-semibold tabular-nums text-foreground">{count(id)}</span>
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <UpNextCard
            appointment={upNext}
            patient={upNext ? patients[upNext.patientId] : undefined}
            hasDraft={!!upNext && draftIds.has(upNext.id)}
            nextUpcoming={nextUpcoming}
          />
          <QueueList appointments={appointments} patients={patients} draftIds={draftIds} />
        </div>
        <NeedsAttention tasks={tasks} labOrders={labOrders} patients={patients} />
      </div>
    </div>
  );
}
