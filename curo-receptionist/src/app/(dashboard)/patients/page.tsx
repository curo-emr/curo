"use client";

import { useState, useEffect } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { PatientList } from "@/components/features/patients/PatientList";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";
import { getPatients } from "@/lib/api/patients";
import type { Patient } from "@/types";

export default function PatientsDirectoryPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getPatients()
      .then(setPatients)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader title="Patients" description="Search and manage patient records">
        <Link href={ROUTES.NEW_PATIENT}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Register Patient
          </Button>
        </Link>
      </PageHeader>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <PatientList patients={patients} allergies={[]} />
      )}
    </div>
  );
}
