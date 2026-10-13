"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { QueryContent, allOf } from "@curo/web/query";
import { PageHeader } from "@curo/web/ui/page-header";
import { ResultsEntryForm } from "@/components/features/worklist/ResultsEntryForm";
import { LabReportUpload } from "@/components/features/worklist/LabReportUpload";
import { useMyCatalog } from "@/lib/catalog";
import { ROUTES } from "@/lib/constants";
import { nextStep, orderNumber } from "@/lib/orders";
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
  const catalog = useMyCatalog();

  return (
    <QueryContent query={allOf(patient, catalog)} what="this order's patient and your test catalog">
      {([p, tests]) => {
        if (!p) notFound();
        return (
          <div className="mx-auto max-w-4xl space-y-6">
            <PageHeader
              back={{ href: ROUTES.ORDER(order.id), label: `Order ${orderNumber(order)}` }}
              title="Enter results"
              description={`${p.name.full} · ${p.mrn}`}
            />

            {nextStep(order) === "results" ? (
              <ResultsEntryForm order={order} patient={p} catalog={tests} />
            ) : (
              <>
                <p className="rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  {notReadyReason(order)}{" "}
                  <Link href={ROUTES.ORDER(order.id)} className="font-medium text-primary hover:underline">View the order</Link>
                </p>
                {/* A report file can still follow; the doctor sees it with the results. */}
                {order.status === "completed" && (
                  <LabReportUpload orderId={order.id} patientId={order.patientId} encounterId={order.encounterId} />
                )}
              </>
            )}
          </div>
        );
      }}
    </QueryContent>
  );
}

/** Why an order that isn't ready for results can't take them. */
function notReadyReason(order: LabOrder) {
  if (order.status === "completed") return "The results for this order are already in.";
  if (order.status === "sent_to_lab") return "Receive the sample before entering its results.";
  return "The doctor hasn't sent this order to the lab, so results can't be entered.";
}
