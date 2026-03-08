import { Suspense } from "react";
import { getLabOrders, getPatients, getLabTestCatalog, getLabStaff } from "@/lib/data/api";
import { WorklistTable } from "@/components/features/worklist/WorklistTable";

export default async function WorklistPage() {
  const [orders, patients, testCatalog, staff] = await Promise.all([
    getLabOrders(),
    getPatients(),
    getLabTestCatalog(),
    getLabStaff(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Worklist</h1>
        <p className="text-sm text-muted-foreground">Manage lab orders, specimens, and results</p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading worklist...</div>}>
        <WorklistTable orders={orders} patients={patients} testCatalog={testCatalog} staff={staff} />
      </Suspense>
    </div>
  );
}
