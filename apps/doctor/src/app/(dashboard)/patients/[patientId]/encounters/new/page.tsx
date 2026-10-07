"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import { UserX } from "lucide-react";
import { EncounterEditor } from "@/components/features/encounters/EncounterEditor";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { getPatientById, getAllergies, getConditions } from "@/lib/api/patients";
import { getPrescriptionsByPatient } from "@/lib/api/clinical";
import { getMedicationCatalog } from "@/lib/api/medications";
import { getLabTestCatalog } from "@/lib/api/catalog";
import { getLabs } from "@/lib/api/labs";
import { recentMedicationNames } from "@/lib/clinical";
import { findTodaysAppointment } from "@/lib/visit";
import type { Allergy, Lab, LabTestCatalogItem, Medication, Patient, Problem } from "@/types";

interface VisitContext {
  patient: Patient | null;
  allergies: Allergy[];
  problems: Problem[];
  recentMedications: string[];
  appointmentId?: string;
  medications: Medication[];
  labTests: LabTestCatalogItem[];
  labs: Lab[];
}

export default function NewVisitPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const appointmentParam = useSearchParams().get("appointmentId") ?? undefined;
  const [ctx, setCtx] = useState<VisitContext | null>(null);

  useEffect(() => {
    Promise.all([
      getPatientById(patientId),
      getAllergies(patientId).catch(() => []),
      getConditions(patientId).catch(() => []),
      getPrescriptionsByPatient(patientId).catch(() => []),
      getMedicationCatalog().catch(() => []),
      getLabTestCatalog().catch(() => []),
      getLabs().catch(() => []),
      // Started from the chart? Attach the visit to the patient's open appointment today.
      appointmentParam ? Promise.resolve(null) : findTodaysAppointment(patientId),
    ])
      .then(([patient, allergies, problems, rxs, medications, labTests, labs, todays]) =>
        setCtx({
          patient, allergies, problems, medications, labTests, labs,
          recentMedications: recentMedicationNames(rxs),
          appointmentId: appointmentParam ?? todays?.id,
        }))
      .catch(() => setCtx({ patient: null, allergies: [], problems: [], recentMedications: [], medications: [], labTests: [], labs: [] }));
  }, [patientId, appointmentParam]);

  if (!ctx) return <PageSkeleton />;
  if (!ctx.patient) return <EmptyState icon={UserX} title="Patient not found" className="min-h-[50vh]" />;

  return (
    <EncounterEditor
      patient={ctx.patient}
      allergies={ctx.allergies}
      problems={ctx.problems}
      recentMedications={ctx.recentMedications}
      appointmentId={ctx.appointmentId}
      medicationsCatalog={ctx.medications}
      labTestsCatalog={ctx.labTests}
      labs={ctx.labs}
    />
  );
}
