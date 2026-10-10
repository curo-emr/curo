"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { PageHeader } from "@curo/web/ui/page-header";
import { HeldList } from "@/components/features/prescriptions/HeldList";
import { WaitingTable } from "@/components/features/prescriptions/WaitingTable";
import { waitingByPatient } from "@/lib/prescriptions";
import { patientQueries, prescriptionQueries } from "@/lib/queries";
import type { Patient } from "@/types";

// One empty list for "not loaded yet", so the table's memo doesn't recompute on every render.
const NONE: Patient[] = [];

export default function PrescriptionsPage() {
  const prescriptions = useQuery(prescriptionQueries.pending());
  const held = useQuery(prescriptionQueries.held());
  const patientIds = [...(prescriptions.data ?? []), ...(held.data ?? [])].map(rx => rx.patientId);
  const patients = useQuery(patientQueries.byIds(patientIds)).data ?? NONE;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Prescriptions" description="Everyone with medicines waiting, longest wait first." />
      <QueryContent query={prescriptions} what="prescriptions">
        {rxs => <WaitingTable waiting={waitingByPatient(rxs)} patients={patients} />}
      </QueryContent>
      <QueryContent query={held} what="the prescriptions on hold" loading={null}>
        {rxs => <HeldList held={rxs} patients={patients} />}
      </QueryContent>
    </div>
  );
}
