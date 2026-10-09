"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Pill, FileText } from "lucide-react";
import { QueryContent, dataOrNull } from "@curo/web/query";
import { Card, CardContent } from "@curo/web/ui/card";
import { Button } from "@curo/web/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@curo/web/ui/tabs";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { PatientSummaryCard } from "@/components/features/patients/PatientSummaryCard";
import { DispenseRecordCard } from "@/components/features/dispensing/DispenseRecordCard";
import { formatDate } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
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
          <div className="space-y-6 max-w-6xl mx-auto">
            <PatientSummaryCard patient={p} allergies={allergies} />

            <Tabs defaultValue="prescriptions" className="w-full">
              <TabsList className="bg-slate-100 p-1 rounded-md mb-4">
                <TabsTrigger value="prescriptions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Pill className="h-4 w-4 mr-2" /> {counted("Prescriptions", prescriptions.data)}
                </TabsTrigger>
                <TabsTrigger value="dispensing" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <FileText className="h-4 w-4 mr-2" /> {counted("Dispensing History", dispensing.data)}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="prescriptions" className="space-y-3">
                <QueryContent query={prescriptions} what="prescriptions">
                  {rxs => rxs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No prescriptions found for this patient.</div>
                  ) : (
                    rxs.map(rx => (
                      <Card key={rx.id} className="shadow-sm border hover:bg-slate-50/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-mono text-sm font-medium text-slate-900">{rx.id.slice(0, 8).toUpperCase()}</span>
                                <StatusBadge status={rx.status} />
                              </div>
                              <p className="text-sm text-slate-600">
                                {rx.items.map(i => i.displayName).join(', ')}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                Prescribed: {formatDate(rx.createdAt)}
                              </p>
                            </div>
                            <Link href={ROUTES.PRESCRIPTION(rx.id)}>
                              <Button variant="outline" size="sm" className="shrink-0">View</Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </QueryContent>
              </TabsContent>

              <TabsContent value="dispensing" className="space-y-3">
                <QueryContent query={dispensing} what="the dispensing history">
                  {records => records.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No dispensing records for this patient.</div>
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
