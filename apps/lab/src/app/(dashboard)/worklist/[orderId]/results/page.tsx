"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { ResultsEntryForm } from "@/components/features/worklist/ResultsEntryForm";
import { LabReportUpload } from "@/components/features/worklist/LabReportUpload";
import { ROUTES } from "@/lib/constants";
import { orderQueries, patientQueries } from "@/lib/queries";
import type { LabOrder } from "@/types";

export default function ResultsEntryPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const order = useQuery(orderQueries.detail(orderId));

  return (
    <QueryContent query={order} what="this order">
      {o => {
        if (!o) notFound();
        return <ResultsEntry order={o} />;
      }}
    </QueryContent>
  );
}

function ResultsEntry({ order }: { order: LabOrder }) {
  const patient = useQuery(patientQueries.detail(order.patientId));

  return (
    <QueryContent query={patient} what="this order's patient">
      {p => {
        if (!p) notFound();
        return (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Results Entry</h1>
              <p className="text-sm text-muted-foreground">{order.id.slice(0, 8).toUpperCase()} - {p.name.full} ({p.mrn})</p>
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
              <ResultsEntryForm order={order} patient={p} />
            )}
          </div>
        );
      }}
    </QueryContent>
  );
}
