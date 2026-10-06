"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { DispensingLogTable } from "@/components/features/dispensing/DispensingLogTable";
import { getDispensingRecords, type DispenseRecord } from "@/lib/api/pharmacy";
import { getPatients } from "@/lib/api/patients";
import type { Patient } from "@/types";

export default function DispensingLogPage() {
  const [records, setRecords] = useState<DispenseRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDispensingRecords(), getPatients()])
      .then(([recs, pts]) => { setRecords(recs); setPatients(pts); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dispensing Log</h1>
        <p className="text-sm text-muted-foreground">Complete record of all dispensed medications</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <DispensingLogTable records={records} patients={patients} staff={[]} />
      )}
    </div>
  );
}
