import { Suspense } from "react";
import { getPatients, getAllAllergies } from "@/lib/data/api";
import { PatientList } from "@/components/features/patients/PatientList";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function PatientsDirectoryPage() {
  const patients = await getPatients();
  const allAllergies = await getAllAllergies();
  const allergyMap = Object.fromEntries(allAllergies.map(a => [a.id, a]));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Patient Directory</h1>
          <p className="text-sm text-muted-foreground">Search and manage patient records</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Patient
        </Button>
      </div>

      {/* Suspense required because PatientList uses useSearchParams() */}
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading patients...</div>}>
        <PatientList initialPatients={patients} allergyMap={allergyMap} />
      </Suspense>
    </div>
  );
}
