"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { WorklistTable } from "@/components/features/worklist/WorklistTable";
import { getLabOrders } from "@/lib/api/lab";
import { getPatients } from "@/lib/api/patients";
import type { LabOrder, Patient } from "@/types";

export default function WorklistPage() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLabOrders(), getPatients()])
      .then(([ords, pts]) => { setOrders(ords); setPatients(pts); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Worklist</h1>
        <p className="text-sm text-muted-foreground">Manage lab orders, specimens, and results</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <WorklistTable orders={orders} patients={patients} />
      )}
    </div>
  );
}
