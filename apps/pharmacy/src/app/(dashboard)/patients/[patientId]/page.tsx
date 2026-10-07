"use client";

import { useState, useEffect, use } from "react";
import { Loader2 } from "lucide-react";
import { getPatientById, getAllergies } from "@/lib/api/patients";
import { getPrescriptionsByPatient, getDispensingRecordsByPatient, type DispenseRecord } from "@/lib/api/pharmacy";
import { formatDate } from "@/lib/utils";
import type { Allergy, Patient, Prescription } from "@/types";
import { Card, CardContent } from "@curo/web/ui/card";
import { Button } from "@curo/web/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@curo/web/ui/tabs";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { Pill, FileText } from "lucide-react";
import { PatientSummaryCard } from "@/components/features/patients/PatientSummaryCard";
import { DispenseRecordCard } from "@/components/features/dispensing/DispenseRecordCard";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [dispensingRecords, setDispensingRecords] = useState<DispenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPatientById(patientId), getAllergies(patientId), getPrescriptionsByPatient(patientId), getDispensingRecordsByPatient(patientId)])
      .then(([pt, alg, rxs, records]) => { setPatient(pt); setAllergies(alg); setPrescriptions(rxs); setDispensingRecords(records); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [patientId]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!patient) return <div className="p-8 text-center text-slate-500">Patient not found.</div>;

  const sortedPrescriptions = [...prescriptions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PatientSummaryCard patient={patient} allergies={allergies} />

      {/* Tabs */}
      <Tabs defaultValue="prescriptions" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-md mb-4">
          <TabsTrigger value="prescriptions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Pill className="h-4 w-4 mr-2" /> Prescriptions ({prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="dispensing" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4 mr-2" /> Dispensing History ({dispensingRecords.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="space-y-3">
          {sortedPrescriptions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No prescriptions found for this patient.</div>
          ) : (
            sortedPrescriptions.map(rx => (
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
        </TabsContent>

        <TabsContent value="dispensing" className="space-y-3">
          {dispensingRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No dispensing records for this patient.</div>
          ) : (
            dispensingRecords.map(record => <DispenseRecordCard key={record.id} record={record} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
