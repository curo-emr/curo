"use client";

import { useState, useEffect, use } from "react";
import { UserX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PatientEditForm } from "@/components/features/patients/PatientEditForm";
import { getPatientById, getAllergies } from "@/lib/api/patients";
import { ROUTES } from "@/lib/constants";
import type { Patient, Allergy } from "@/types";

export default function PatientEditPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const [data, setData] = useState<{ patient: Patient | null; allergies: Allergy[] } | null>(null);

  useEffect(() => {
    Promise.all([getPatientById(patientId), getAllergies(patientId).catch(() => [] as Allergy[])])
      .then(([patient, allergies]) => setData({ patient, allergies }))
      .catch(() => setData({ patient: null, allergies: [] }));
  }, [patientId]);

  if (!data) return <PageSkeleton side={false} />;
  if (!data.patient) return <EmptyState icon={UserX} title="Patient not found" className="min-h-[50vh]" />;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        back={{ href: ROUTES.PATIENT(patientId), label: data.patient.name.full }}
        title="Edit patient details"
        description={`${data.patient.name.full} · ${data.patient.mrn}`}
      />
      <PatientEditForm patient={data.patient} existingAllergies={data.allergies} />
    </div>
  );
}
