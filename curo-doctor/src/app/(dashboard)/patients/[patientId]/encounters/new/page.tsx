"use client";

import { useState, useEffect, use } from "react";
import { Loader2 } from "lucide-react";
import { getPatientById } from "@/lib/api/patients";
import { getICD10Subset, getMedicationCatalog, getLabTestCatalog } from "@/lib/data/api";
import { EncounterEditor } from "@/components/features/encounters/EncounterEditor";
import type { Patient, ICD10, Medication, LabTestCatalogItem } from "@/types";
import { useSearchParams } from "next/navigation";

export default function NewEncounterPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId") ?? undefined;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [icd10Catalog, setIcd10Catalog] = useState<ICD10[]>([]);
  const [medicationsCatalog, setMedicationsCatalog] = useState<Medication[]>([]);
  const [labTestsCatalog, setLabTestsCatalog] = useState<LabTestCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPatientById(patientId),
      getICD10Subset(),
      getMedicationCatalog(),
      getLabTestCatalog(),
    ])
      .then(([pt, icd, meds, labs]) => {
        setPatient(pt);
        setIcd10Catalog(icd);
        setMedicationsCatalog(meds);
        setLabTestsCatalog(labs);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!patient) {
    return <div className="p-8 text-center text-slate-500">Patient not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <EncounterEditor
        patient={patient}
        appointmentId={appointmentId}
        icd10Catalog={icd10Catalog}
        medicationsCatalog={medicationsCatalog}
        labTestsCatalog={labTestsCatalog}
      />
    </div>
  );
}
