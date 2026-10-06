"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PrescriptionTable } from "@/components/features/prescriptions/PrescriptionTable";
import { getPendingPrescriptions } from "@/lib/api/pharmacy";
import { getPatients } from "@/lib/api/patients";
import type { Prescription, Patient } from "@/types";

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPendingPrescriptions(), getPatients()])
      .then(([rxs, pts]) => { setPrescriptions(rxs); setPatients(pts); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Prescriptions</h1>
        <p className="text-sm text-muted-foreground">View and manage incoming e-prescriptions</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <PrescriptionTable prescriptions={prescriptions} patients={patients} />
      )}
    </div>
  );
}
