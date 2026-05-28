"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PatientList } from "@/components/features/patients/PatientList";
import { getPatients } from "@/lib/api/patients";
import { getLabOrders } from "@/lib/api/lab";
import type { Patient, LabOrder } from "@/types";

export default function PatientsDirectoryPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPatients(), getLabOrders()])
      .then(([pts, ords]) => { setPatients(pts); setOrders(ords); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Patient Directory</h1>
        <p className="text-sm text-muted-foreground">Look up patients and view lab history</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <PatientList patients={patients} orders={orders} />
      )}
    </div>
  );
}
