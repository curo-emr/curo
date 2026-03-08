import { Suspense } from "react";
import { getPrescriptions, getPatients } from "@/lib/data/api";
import { PrescriptionTable } from "@/components/features/prescriptions/PrescriptionTable";

export default async function PrescriptionsPage() {
  const [prescriptions, patients] = await Promise.all([
    getPrescriptions(),
    getPatients(),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Prescriptions</h1>
        <p className="text-sm text-muted-foreground">View and manage incoming e-prescriptions</p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading prescriptions...</div>}>
        <PrescriptionTable prescriptions={prescriptions} patients={patients} />
      </Suspense>
    </div>
  );
}
