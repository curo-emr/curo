"use client";

import { useState, useEffect, use } from "react";
import { Loader2 } from "lucide-react";
import { ResultsEntryForm } from "@/components/features/worklist/ResultsEntryForm";
import { LabReportUpload } from "@/components/features/worklist/LabReportUpload";
import { getLabOrderById } from "@/lib/api/lab";
import { getPatientById } from "@/lib/api/patients";
import type { LabOrder, Patient } from "@/types";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";

export default function ResultsEntryPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [order, setOrder] = useState<LabOrder | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getLabOrderById(orderId).then(async ord => {
      if (!ord) { setIsLoading(false); return; }
      setOrder(ord);
      setPatient(await getPatientById(ord.patientId));
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [orderId]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!order || !patient) return <div className="p-8 text-center text-slate-500">Order not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Results Entry</h1>
        <p className="text-sm text-muted-foreground">{order.id.slice(0, 8).toUpperCase()} - {patient.name.full} ({patient.mrn})</p>
      </div>

      {order.status === 'completed' ? (
        <>
          <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Results for this order have already been entered.{" "}
            <Link href={ROUTES.ORDER(order.id)} className="font-medium text-primary hover:underline">View the order</Link>
          </div>
          {/* A report file can still follow; the doctor sees it with the results. */}
          <LabReportUpload orderId={order.id} patientId={order.patientId} encounterId={order.encounterId} />
        </>
      ) : (
        <ResultsEntryForm order={order} patient={patient} />
      )}
    </div>
  );
}
