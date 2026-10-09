"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { PageHeader } from "@curo/web/ui/page-header";
import { getTodayString } from "@/lib/utils";
import { QueueBoard } from "@/components/features/queue/QueueBoard";
import { useDoctors } from "@/lib/hooks/useDoctors";
import { appointmentQueries, patientQueries } from "@/lib/queries";
import type { Patient } from "@/types";

const NONE: Patient[] = [];

export default function QueuePage() {
  // Today's checked-in patients, refreshed while the board is open.
  const queue = useQuery(appointmentQueries.queue(getTodayString()));
  const patients = useQuery(patientQueries.byIds((queue.data ?? []).map(a => a.patientId))).data ?? NONE;
  const doctors = useDoctors();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Queue board"
        description="Today's checked-in patients, from triage to the doctor. It updates by itself."
      />

      <QueryContent query={queue} what="the queue">
        {appointments => <QueueBoard appointments={appointments} patients={patients} doctors={doctors} />}
      </QueryContent>
    </div>
  );
}
