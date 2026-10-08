"use client";

import { useState, useEffect, use } from "react";
import { Loader2 } from "lucide-react";
import { LoadError } from "@curo/web/ui/load-error";
import { getPatientById, getAllergies } from "@/lib/api/patients";
import { PatientEditForm } from "@/components/features/patients/PatientEditForm";
import type { Patient, Allergy } from "@/types";

type Loaded = { patient: Patient | null; allergies: Allergy[] };

export default function PatientEditPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    Promise.all([getPatientById(patientId), getAllergies(patientId)])
      .then(([patient, allergies]) => setLoaded({ patient, allergies }))
      .catch(() => setFailed(true));
  }, [patientId, attempt]);

  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  // The form takes its starting values once, so it waits for both; editing
  // against allergies that failed to load would look like there are none.
  if (failed) return <LoadError what="this patient" onRetry={retry} className="min-h-[50vh]" />;
  if (!loaded) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  const { patient, allergies } = loaded;
  if (!patient) return <div className="p-8 text-center text-slate-500">Patient not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit Patient Demographics</h1>
        <p className="text-sm text-muted-foreground mt-1">Update information for {patient.name.full} ({patient.mrn})</p>
      </div>
      <PatientEditForm patient={patient} existingAllergies={allergies} />
    </div>
  );
}
