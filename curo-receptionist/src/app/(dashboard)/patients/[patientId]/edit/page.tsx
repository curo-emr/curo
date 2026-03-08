import { notFound } from "next/navigation";
import { getPatientById } from "@/lib/data/api";
import { PatientEditForm } from "@/components/features/patients/PatientEditForm";

export default async function PatientEditPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  const patient = await getPatientById(patientId);
  if (!patient) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Edit Patient Demographics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update information for {patient.name.full} ({patient.mrn})
        </p>
      </div>
      <PatientEditForm patient={patient} />
    </div>
  );
}
