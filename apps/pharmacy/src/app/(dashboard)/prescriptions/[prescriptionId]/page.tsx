"use client";

import { useState, useEffect, use } from "react";
import { Loader2, Pill, ClipboardList, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PatientSummaryCard } from "@/components/features/patients/PatientSummaryCard";
import { DispenseRecordCard } from "@/components/features/dispensing/DispenseRecordCard";
import Link from "next/link";
import { formatDate, formatStatus } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { getPatientById, getAllergies } from "@/lib/api/patients";
import {
  getPrescription,
  getDispensingRecordsByPrescription,
  dispense,
  type DispenseRecord,
} from "@/lib/api/pharmacy";
import { apiErrorMessage } from "@/lib/api/client";
import type { Allergy, Patient, Prescription, PrescriptionItem } from "@/types";

// Only active prescriptions (mapped to "sent_to_pharmacy") can be dispensed.
const DISPENSABLE_STATUS = "sent_to_pharmacy";

function medicationDetails(item: PrescriptionItem): [string, string][] {
  const details: [string, string][] = [
    ["Directions", item.instructions],
    ["Frequency", item.frequency],
    ["Route", item.route],
    ["Quantity", `${item.quantity} ${item.quantityUnit}`.trim()],
    ["Duration", item.durationDays ? `${item.durationDays} days` : ""],
  ];
  return details.filter(([, value]) => value);
}

export default function PrescriptionDetailPage({ params }: { params: Promise<{ prescriptionId: string }> }) {
  const { prescriptionId } = use(params);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [dispensingRecords, setDispensingRecords] = useState<DispenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDispensing, setIsDispensing] = useState(false);
  const [dispenseError, setDispenseError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const rx = await getPrescription(prescriptionId);
        const [pt, alg, records] = await Promise.all([
          getPatientById(rx.patientId),
          getAllergies(rx.patientId),
          getDispensingRecordsByPrescription(prescriptionId),
        ]);
        setPrescription(rx);
        setPatient(pt);
        setAllergies(alg);
        setDispensingRecords(records);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [prescriptionId]);

  const handleDispense = async () => {
    setIsDispensing(true);
    setDispenseError(null);
    try {
      const record = await dispense(prescriptionId);
      setDispensingRecords(prev => [record, ...prev]);
      setPrescription(prev => prev && { ...prev, status: "completed" });
    } catch (err: unknown) {
      setDispenseError(apiErrorMessage(err, "Failed to dispense prescription."));
    } finally {
      setIsDispensing(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  // Never offer a dispense without the patient and allergies on screen.
  if (!prescription || !patient) return <div className="p-8 text-center text-slate-500">Could not load this prescription.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.PRESCRIPTIONS}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prescription Details</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{prescriptionId.slice(0, 8).toUpperCase()}</span>
            <StatusBadge status={prescription.status} />
            <span>Prescribed {formatDate(prescription.createdAt)}</span>
          </div>
        </div>
      </div>

      <PatientSummaryCard patient={patient} allergies={allergies} />

      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4 text-green-600" />
            Medication
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {prescription.items.map(item => (
            <div key={item.id}>
              <p className="font-semibold text-slate-900">{item.displayName}</p>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mt-2 text-sm">
                {medicationDetails(item).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          {prescription.notesToPharmacy && (
            <p className="text-sm bg-muted rounded-md px-3 py-2">
              <span className="font-medium">Note: </span>{prescription.notesToPharmacy}
            </p>
          )}
        </CardContent>
        <div className="border-t p-4 space-y-3">
          {prescription.status === DISPENSABLE_STATUS ? (
            <Button onClick={handleDispense} disabled={isDispensing} className="bg-green-600 hover:bg-green-700">
              {isDispensing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Dispensing...</> : "Dispense Prescription"}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              This prescription is {formatStatus(prescription.status).toLowerCase()} and can&apos;t be dispensed.
            </p>
          )}
          {dispenseError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{dispenseError}</div>
          )}
        </div>
      </Card>

      {dispensingRecords.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <ClipboardList className="h-4 w-4 text-purple-600" />
            Dispensing History
          </h2>
          {dispensingRecords.map(record => <DispenseRecordCard key={record.id} record={record} />)}
        </section>
      )}
    </div>
  );
}
