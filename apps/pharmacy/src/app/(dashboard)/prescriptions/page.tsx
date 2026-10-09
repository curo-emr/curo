"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { PrescriptionTable } from "@/components/features/prescriptions/PrescriptionTable";
import { patientQueries, prescriptionQueries } from "@/lib/queries";
import type { Patient } from "@/types";

// One empty list for "not loaded yet", so the table's memo doesn't recompute on every render.
const NONE: Patient[] = [];

export default function PrescriptionsPage() {
  const prescriptions = useQuery(prescriptionQueries.pending());
  const patients = useQuery(patientQueries.byIds((prescriptions.data ?? []).map(rx => rx.patientId))).data ?? NONE;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Prescriptions</h1>
        <p className="text-sm text-muted-foreground">View and manage incoming e-prescriptions</p>
      </div>

      <QueryContent query={prescriptions} what="prescriptions">
        {rxs => <PrescriptionTable prescriptions={rxs} patients={patients} />}
      </QueryContent>
    </div>
  );
}
