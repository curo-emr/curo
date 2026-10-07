"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { WorklistTable } from "@/components/features/worklist/WorklistTable";
import { ScanBox } from "@/components/features/worklist/ScanBox";
import { getLabOrders, getLabOrdersFirstPage } from "@/lib/api/lab";
import { getPatientsByIds } from "@/lib/api/patients";
import { ROUTES } from "@/lib/constants";
import type { LabOrder, Patient } from "@/types";

// useSearchParams needs a Suspense boundary for the page to prerender.
export default function WorklistPage() {
  return (
    <Suspense>
      <Worklist />
    </Suspense>
  );
}

function Worklist() {
  // Set when a scanned visit slip narrowed the list to that visit's tests.
  const visit = useSearchParams().get("visit") ?? undefined;
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (visit ? getLabOrders({ encounterId: visit }) : getLabOrdersFirstPage())
      .then(async (ords) => {
        const pts = await getPatientsByIds(ords.map(o => o.patientId));
        setOrders(ords);
        setPatients(pts);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [visit]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Worklist</h1>
        <p className="text-sm text-muted-foreground">Manage lab orders, specimens, and results</p>
      </div>

      <ScanBox />

      {visit && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
          <span className="text-foreground">Showing the tests from one visit that were sent to your lab.</span>
          <Link href={ROUTES.WORKLIST} className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline">
            <X className="h-3.5 w-3.5" /> Show all
          </Link>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <WorklistTable orders={orders} patients={patients} />
      )}
    </div>
  );
}
