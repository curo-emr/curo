"use client";

import { useState, useEffect, use } from "react";
import { AxiosError } from "axios";
import { Loader2, User, Phone, Pill, ClipboardList, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import { formatDate, calculateAge } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { getPrescriptionsByPatient, getDispensingRecordsByPrescription, dispense, type DispenseRecord } from "@/lib/api/pharmacy";
import { getPatientById } from "@/lib/api/patients";
import type { Patient, Prescription } from "@/types";

export default function PrescriptionDetailPage({ params }: { params: Promise<{ prescriptionId: string }> }) {
  const { prescriptionId } = use(params);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [dispensingRecords, setDispensingRecords] = useState<DispenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDispensing, setIsDispensing] = useState(false);
  const [dispenseSuccess, setDispenseSuccess] = useState(false);
  const [dispenseError, setDispenseError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // We don't have a direct GET /prescriptions/:id endpoint, so fetch by patient context
        // The prescriptionId is passed in; we need to find the patient first via a scan
        const records = await getDispensingRecordsByPrescription(prescriptionId).catch(() => []);
        setDispensingRecords(records);

        // Try to load full details if we can get patientId from any source
        // For now, load dispense records and show what we have
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
      setDispenseSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof AxiosError
        ? err.response?.data?.message
        : undefined;
      setDispenseError(message ?? "Failed to dispense prescription.");
    } finally {
      setIsDispensing(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.PRESCRIPTIONS}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prescription Details</h1>
          <p className="text-sm text-muted-foreground">{prescriptionId.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4 text-green-600" />
            Dispense Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {dispenseSuccess ? (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              Prescription dispensed successfully. Receipt generated.
            </div>
          ) : dispenseError ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{dispenseError}</div>
          ) : (
            <Button onClick={handleDispense} disabled={isDispensing} className="bg-green-600 hover:bg-green-700">
              {isDispensing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Dispensing...</> : "Dispense Prescription"}
            </Button>
          )}
        </CardContent>
      </Card>

      {dispensingRecords.length > 0 && (
        <Card className="shadow-sm border">
          <CardHeader className="bg-muted/50 border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-purple-600" />
              Dispensing History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {dispensingRecords.map(record => (
                <div key={record.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Receipt: {record.receiptNumber}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(record.dispensedAt)}</span>
                  </div>
                  <div className="space-y-1">
                    {record.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-600">{item.medicationName}</span>
                        <span className="font-medium">x{item.quantity} — LKR {item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-right text-sm font-semibold mt-2">Total: LKR {record.totalAmount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
