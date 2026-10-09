"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { QueryContent, allOf } from "@curo/web/query";
import { PatientEditForm } from "@/components/features/patients/PatientEditForm";
import { patientQueries } from "@/lib/queries";

export default function PatientEditPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  // The form takes its starting values once, so it waits for both; editing
  // against allergies that failed to load would look like there are none.
  const record = allOf(useQuery(patientQueries.detail(patientId)), useQuery(patientQueries.allergies(patientId)));

  return (
    <QueryContent query={record} what="this patient">
      {([patient, allergies]) => {
        if (!patient) notFound();
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit Patient Demographics</h1>
              <p className="text-sm text-muted-foreground mt-1">Update information for {patient.name.full} ({patient.mrn})</p>
            </div>
            <PatientEditForm patient={patient} existingAllergies={allergies} />
          </div>
        );
      }}
    </QueryContent>
  );
}
