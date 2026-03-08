import { notFound } from "next/navigation";
import { getLabOrderById, getPatientById, getLabTestCatalog } from "@/lib/data/api";
import { ResultsEntryForm } from "@/components/features/worklist/ResultsEntryForm";

export default async function ResultsEntryPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await getLabOrderById(orderId);
  if (!order) notFound();

  const [patient, testCatalog] = await Promise.all([
    getPatientById(order.patientId),
    getLabTestCatalog(),
  ]);

  if (!patient) notFound();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Results Entry</h1>
        <p className="text-sm text-muted-foreground">
          {order.accessionNumber} - {patient.name.full} ({patient.mrn})
        </p>
      </div>

      <ResultsEntryForm order={order} patient={patient} testCatalog={testCatalog} />
    </div>
  );
}
