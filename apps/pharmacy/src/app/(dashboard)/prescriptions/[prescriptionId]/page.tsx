"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pill, ClipboardList, ArrowLeft } from "lucide-react";
import { apiErrorMessage } from "@curo/web/api";
import { formatStatus } from "@curo/web/format";
import { QueryContent, allOf, dataOrNull } from "@curo/web/query";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Button } from "@curo/web/ui/button";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { PatientSummaryCard } from "@/components/features/patients/PatientSummaryCard";
import { DispenseRecordCard } from "@/components/features/dispensing/DispenseRecordCard";
import { formatDate } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { dispense } from "@/lib/api/pharmacy";
import { invalidateAfterDispense, patientQueries, prescriptionQueries } from "@/lib/queries";
import type { Prescription, PrescriptionItem } from "@/types";

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
  const prescription = useQuery(prescriptionQueries.detail(prescriptionId));

  return (
    <QueryContent query={prescription} what="this prescription">
      {rx => {
        if (!rx) notFound();
        return <PrescriptionDetail prescription={rx} />;
      }}
    </QueryContent>
  );
}

function PrescriptionDetail({ prescription }: { prescription: Prescription }) {
  const queryClient = useQueryClient();
  const { patientId } = prescription;
  const patient = useQuery(patientQueries.detail(patientId));
  const allergiesQuery = useQuery(patientQueries.allergies(patientId));
  const allergies = dataOrNull(allergiesQuery);
  const records = useQuery(prescriptionQueries.dispensing(prescription.id));

  const dispenseRx = useMutation({
    mutationFn: () => dispense(prescription.id),
    onSuccess: () => invalidateAfterDispense(queryClient, patientId),
  });

  // Never dispense without the patient and their allergies on screen.
  const checks = allOf(patient, allergiesQuery);
  const checked = !!patient.data && !!allergies;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.PRESCRIPTIONS}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prescription Details</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{prescription.id.slice(0, 8).toUpperCase()}</span>
            <StatusBadge status={prescription.status} />
            <span>Prescribed {formatDate(prescription.createdAt)}</span>
          </div>
        </div>
      </div>

      <QueryContent query={patient} what="the patient">
        {p => (p ? <PatientSummaryCard patient={p} allergies={allergies} /> : <p className="text-sm text-muted-foreground">This prescription&apos;s patient wasn&apos;t found.</p>)}
      </QueryContent>

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
            <>
              <Button onClick={() => dispenseRx.mutate()} disabled={!checked || dispenseRx.isPending} className="bg-green-600 hover:bg-green-700">
                {dispenseRx.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Dispensing...</> : "Dispense Prescription"}
              </Button>
              {!checked && checks.isError && (
                <p className="text-sm text-status-error-text">
                  The patient&apos;s record or allergies couldn&apos;t be loaded, so this can&apos;t be dispensed until they are.{" "}
                  <button type="button" className="font-medium underline" onClick={() => void checks.refetch()}>
                    Try again
                  </button>
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              This prescription is {formatStatus(prescription.status).toLowerCase()} and can&apos;t be dispensed.
            </p>
          )}
          {dispenseRx.isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {apiErrorMessage(dispenseRx.error, "Failed to dispense prescription.")}
            </div>
          )}
        </div>
      </Card>

      <QueryContent query={records} what="the dispensing history" loading={null}>
        {list => list.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <ClipboardList className="h-4 w-4 text-purple-600" />
              Dispensing History
            </h2>
            {list.map(record => <DispenseRecordCard key={record.id} record={record} />)}
          </section>
        )}
      </QueryContent>
    </div>
  );
}
