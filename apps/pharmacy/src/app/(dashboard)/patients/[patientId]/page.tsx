"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Pill, ReceiptText } from "lucide-react";
import { QueryContent, dataOrNull } from "@curo/web/query";
import { Button } from "@curo/web/ui/button";
import { Card } from "@curo/web/ui/card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { BackLink } from "@curo/web/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@curo/web/ui/tabs";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { PatientSummaryCard } from "@/components/features/patients/PatientSummaryCard";
import { DispenseRecordCard } from "@/components/features/dispensing/DispenseRecordCard";
import { formatDate } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { medicineName } from "@/lib/prescriptions";
import { patientQueries } from "@/lib/queries";

/** A tab's label with its count once the count is known. */
const counted = (label: string, items: unknown[] | undefined) => (items ? `${label} (${items.length})` : label);

export default function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const patient = useQuery(patientQueries.detail(patientId));
  const allergies = dataOrNull(useQuery(patientQueries.allergies(patientId)));
  const prescriptions = useQuery(patientQueries.prescriptions(patientId));
  const dispensing = useQuery(patientQueries.dispensing(patientId));

  return (
    <QueryContent query={patient} what="this patient">
      {p => {
        if (!p) notFound();
        return (
          <div className="mx-auto max-w-5xl space-y-6">
            <BackLink href={ROUTES.PATIENTS} label="All patients" />
            <PatientSummaryCard patient={p} allergies={allergies} />

            <Tabs defaultValue="prescriptions">
              <TabsList className="mb-2">
                <TabsTrigger value="prescriptions">
                  <ClipboardList /> {counted("Prescriptions", prescriptions.data)}
                </TabsTrigger>
                <TabsTrigger value="dispensing">
                  <ReceiptText /> {counted("Dispensed", dispensing.data)}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="prescriptions" className="space-y-3">
                <QueryContent query={prescriptions} what="prescriptions">
                  {rxs => rxs.length === 0 ? (
                    <Card><EmptyState icon={Pill} title="No prescriptions yet" description="Prescriptions from this patient's visits appear here." /></Card>
                  ) : (
                    <Card className="divide-y">
                      {rxs.map(rx => (
                        <div key={rx.id} className="flex items-center justify-between gap-4 px-5 py-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">{medicineName(rx)}</span>
                              <StatusBadge status={rx.status} />
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">Prescribed {formatDate(rx.createdAt)}</p>
                          </div>
                          <Button asChild variant="outline" size="sm" className="shrink-0">
                            <Link href={ROUTES.PRESCRIPTION(rx.id)}>Open</Link>
                          </Button>
                        </div>
                      ))}
                    </Card>
                  )}
                </QueryContent>
              </TabsContent>

              <TabsContent value="dispensing" className="space-y-3">
                <QueryContent query={dispensing} what="the dispensing history">
                  {records => records.length === 0 ? (
                    <Card><EmptyState icon={ReceiptText} title="Nothing dispensed yet" description="Dispenses from every pharmacy appear here." /></Card>
                  ) : (
                    records.map(record => <DispenseRecordCard key={record.id} record={record} />)
                  )}
                </QueryContent>
              </TabsContent>
            </Tabs>
          </div>
        );
      }}
    </QueryContent>
  );
}
