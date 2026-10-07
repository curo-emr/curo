"use client";

import { Suspense } from "react";
import { PatientList } from "@/components/features/patients/PatientList";

export default function PatientsDirectoryPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Patient Directory</h1>
        <p className="text-sm text-muted-foreground">Look up patients and view lab history</p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading patients...</div>}>
        <PatientList />
      </Suspense>
    </div>
  );
}
