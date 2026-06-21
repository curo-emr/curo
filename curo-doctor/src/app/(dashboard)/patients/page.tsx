"use client";

import { useState, useEffect, Suspense } from "react";
import { PatientList } from "@/components/features/patients/PatientList";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { getPatients, getAllergies } from "@/lib/api/patients";
import type { Patient, Allergy } from "@/types";

export default function PatientsDirectoryPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [allergyMap, setAllergyMap] = useState<Record<string, Allergy>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const fetched = await getPatients();
        // Allergies live on a separate endpoint, so fetch them per patient and
        // build the id -> Allergy lookup the table tooltip expects.
        const perPatient = await Promise.all(
          fetched.map(p => getAllergies(p.id).catch(() => [] as Allergy[])),
        );
        const map: Record<string, Allergy> = {};
        const enriched = fetched.map((p, i) => {
          const allergies = perPatient[i];
          for (const a of allergies) map[a.id] = a;
          return { ...p, allergies: allergies.map(a => a.id) };
        });
        setPatients(enriched);
        setAllergyMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Patient Directory</h1>
          <p className="text-sm text-muted-foreground">Search and manage patient records</p>
        </div>
        <Link href={ROUTES.NEW_PATIENT}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading patients...</div>}>
          <PatientList initialPatients={patients} allergyMap={allergyMap} />
        </Suspense>
      )}
    </div>
  );
}
