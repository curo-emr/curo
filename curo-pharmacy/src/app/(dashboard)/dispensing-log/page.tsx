import { Suspense } from "react";
import { getDispensingRecords, getPatients, getPharmacyStaff } from "@/lib/data/api";
import { DispensingLogTable } from "@/components/features/dispensing/DispensingLogTable";

export default async function DispensingLogPage() {
  const [records, patients, staff] = await Promise.all([
    getDispensingRecords(),
    getPatients(),
    getPharmacyStaff(),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dispensing Log</h1>
        <p className="text-sm text-muted-foreground">Complete record of all dispensed medications</p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading dispensing records...</div>}>
        <DispensingLogTable records={records} patients={patients} staff={staff} />
      </Suspense>
    </div>
  );
}
