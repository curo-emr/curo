"use client";

import { use } from "react";
import { UserX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@curo/web/ui/empty-state";
import { LoadError } from "@curo/web/ui/load-error";
import { PageHeader } from "@curo/web/ui/page-header";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PatientEditForm } from "@/components/features/patients/PatientEditForm";
import { ROUTES } from "@/lib/constants";
import { patientQueries } from "@/lib/queries";

export default function PatientEditPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const patient = useQuery(patientQueries.detail(patientId));
  const allergies = useQuery(patientQueries.allergies(patientId));

  // The form takes its starting values once, so it waits for both; editing
  // against allergies that failed to load would look like there are none.
  if (patient.data === undefined || allergies.data === undefined) {
    const failed = patient.isError ? patient : allergies.isError ? allergies : null;
    return failed
      ? <LoadError what="this patient" onRetry={() => void failed.refetch()} retrying={failed.isFetching} className="min-h-[50vh]" />
      : <PageSkeleton side={false} />;
  }
  if (!patient.data) return <EmptyState icon={UserX} title="Patient not found" className="min-h-[50vh]" />;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        back={{ href: ROUTES.PATIENT(patientId), label: patient.data.name.full }}
        title="Edit patient details"
        description={`${patient.data.name.full} · ${patient.data.mrn}`}
      />
      <PatientEditForm patient={patient.data} existingAllergies={allergies.data} />
    </div>
  );
}
