"use client";

import { DispensingLogTable } from "@/components/features/dispensing/DispensingLogTable";

export default function DispensingLogPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dispensing Log</h1>
        <p className="text-sm text-muted-foreground">Complete record of all dispensed medications</p>
      </div>

      <DispensingLogTable />
    </div>
  );
}
