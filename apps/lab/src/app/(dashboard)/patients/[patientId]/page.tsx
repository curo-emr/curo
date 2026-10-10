"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, FileText, FlaskConical } from "lucide-react";
import { QueryContent, allOf } from "@curo/web/query";
import { Button } from "@curo/web/ui/button";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { BackLink } from "@curo/web/ui/page-header";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@curo/web/ui/tabs";
import { PriorityBadge } from "@/components/features/orders/PriorityBadge";
import { ResultsTable } from "@/components/features/orders/ResultsTable";
import { PatientCard } from "@/components/features/patients/PatientCard";
import type { LabResult } from "@/lib/api/lab";
import { ROUTES } from "@/lib/constants";
import { STEP_ACTION, nextStep, orderNumber, orderStatus } from "@/lib/orders";
import { patientQueries } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import type { LabOrder, Patient } from "@/types";

export default function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const record = allOf(
    useQuery(patientQueries.detail(patientId)),
    useQuery(patientQueries.orders(patientId)),
    useQuery(patientQueries.results(patientId)),
  );

  return (
    <QueryContent query={record} what="this patient">
      {([patient, orders, results]) => {
        if (!patient) notFound();
        return <PatientRecord patient={patient} orders={orders} results={results} />;
      }}
    </QueryContent>
  );
}

function PatientRecord({ patient, orders, results }: { patient: Patient; orders: LabOrder[]; results: LabResult[] }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href={ROUTES.PATIENTS} label="All patients" />
      <PatientCard patient={patient} />

      <Tabs defaultValue="orders">
        <TabsList className="mb-2">
          <TabsTrigger value="orders"><ClipboardList /> Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="results"><FileText /> Results ({results.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          {orders.length === 0 ? (
            <Card><EmptyState icon={FlaskConical} title="No lab orders yet" description="Orders sent to your lab for this patient appear here." /></Card>
          ) : (
            <Card className="divide-y">
              {orders.map(order => {
                const step = nextStep(order);
                return (
                  <div key={order.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground">{orderNumber(order)}</span>
                        <StatusBadge status={orderStatus(order)} />
                        {order.priority !== "routine" && <PriorityBadge priority={order.priority} />}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-foreground">{order.tests.map(t => t.name).join(", ")}</p>
                      <p className="text-xs text-muted-foreground">Ordered {formatDate(order.createdAt)}</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <Link href={step ? STEP_ACTION[step].href(order.id) : ROUTES.ORDER(order.id)}>
                        {step ? STEP_ACTION[step].label : "View"}
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-3">
          {results.length === 0 ? (
            <Card><EmptyState icon={FileText} title="No results yet" description="Results your lab reports for this patient appear here." /></Card>
          ) : (
            results.map(result => (
              <Card key={result.id} className="gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <Link href={ROUTES.ORDER(result.orderId)} className="font-mono font-medium text-foreground hover:text-primary">
                    Order {orderNumber({ id: result.orderId })}
                  </Link>
                  <span className="text-xs text-muted-foreground">Reported {formatDate(result.performedAt)}</span>
                </div>
                <ResultsTable result={result} />
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
