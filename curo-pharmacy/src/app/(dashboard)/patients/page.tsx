import { Suspense } from "react";
import { getPatients, getPrescriptions } from "@/lib/data/api";
import { PatientList } from "@/components/features/patients/PatientList";

export default async function PatientsDirectoryPage() {
  const [patients, prescriptions] = await Promise.all([
    getPatients(),
    getPrescriptions(),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Patient Directory</h1>
        <p className="text-sm text-muted-foreground">Look up patients and view prescription history</p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading patients...</div>}>
        <PatientList patients={patients} prescriptions={prescriptions} />
      </Suspense>
    </div>
  );
}
