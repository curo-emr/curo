"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { PageHeader } from "@curo/web/ui/page-header";
import { WaitingTable } from "@/components/features/prescriptions/WaitingTable";
import { waitingByPatient } from "@/lib/prescriptions";
import { patientQueries, prescriptionQueries } from "@/lib/queries";
import type { Patient } from "@/types";

// One empty list for "not loaded yet", so the table's memo doesn't recompute on every render.
const NONE: Patient[] = [];

export default function PrescriptionsPage() {
  const prescriptions = useQuery(prescriptionQueries.pending());
  const patients = useQuery(patientQueries.byIds((prescriptions.data ?? []).map(rx => rx.patientId))).data ?? NONE;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Prescriptions" description="Everyone with medicines waiting, longest wait first." />
      <QueryContent query={prescriptions} what="prescriptions">
        {rxs => <WaitingTable waiting={waitingByPatient(rxs)} patients={patients} />}
      </QueryContent>
    </div>
  );
}
