"use client";

import { useState, useEffect, use } from "react";
import { Loader2 } from "lucide-react";
import { getPatientById, getAllergies } from "@/lib/api/patients";
import { PatientEditForm } from "@/components/features/patients/PatientEditForm";
import type { Patient, Allergy } from "@/types";

export default function PatientEditPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [existingAllergies, setExistingAllergies] = useState<Allergy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPatientById(patientId), getAllergies(patientId)])
      .then(([pt, alg]) => { setPatient(pt); setExistingAllergies(alg); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [patientId]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!patient) return <div className="p-8 text-center text-slate-500">Patient not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit Patient Demographics</h1>
        <p className="text-sm text-muted-foreground mt-1">Update information for {patient.name.full} ({patient.mrn})</p>
      </div>
      <PatientEditForm patient={patient} existingAllergies={existingAllergies} />
    </div>
  );
}
