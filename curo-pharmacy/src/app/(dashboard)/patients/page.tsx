"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PatientList } from "@/components/features/patients/PatientList";
import { getPatients } from "@/lib/api/patients";
import { getPendingPrescriptions } from "@/lib/api/pharmacy";
import type { Patient, Prescription } from "@/types";

export default function PatientsDirectoryPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPatients(), getPendingPrescriptions()])
      .then(([pts, rxs]) => { setPatients(pts); setPrescriptions(rxs); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Patient Directory</h1>
        <p className="text-sm text-muted-foreground">Look up patients and view prescription history</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <PatientList patients={patients} prescriptions={prescriptions} />
      )}
    </div>
  );
}
