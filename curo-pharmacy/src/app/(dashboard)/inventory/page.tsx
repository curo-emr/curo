import { Suspense } from "react";
import { getMedications } from "@/lib/data/api";
import { MedicationList } from "@/components/features/inventory/MedicationList";

export default async function InventoryPage() {
  const medications = await getMedications();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Inventory</h1>
        <p className="text-sm text-muted-foreground">Manage medication stock, track levels, and monitor expiry dates</p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading inventory...</div>}>
        <MedicationList medications={medications} />
      </Suspense>
    </div>
  );
}
