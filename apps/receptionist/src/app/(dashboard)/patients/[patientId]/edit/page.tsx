"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { QueryContent, allOf } from "@curo/web/query";
import { PatientEditForm } from "@/components/features/patients/PatientEditForm";
import { PageHeader } from "@curo/web/ui/page-header";
import { patientQueries } from "@/lib/queries";
import { ROUTES } from "@/lib/constants";

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
            <PageHeader
              title="Edit patient details"
              description={`${patient.name.full} · ${patient.mrn}`}
              back={{ href: ROUTES.PATIENT(patient.id), label: patient.name.full }}
            />
            <PatientEditForm patient={patient} existingAllergies={allergies} />
          </div>
        );
      }}
    </QueryContent>
  );
}
