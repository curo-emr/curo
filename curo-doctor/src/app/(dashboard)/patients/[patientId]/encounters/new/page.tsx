import { notFound } from "next/navigation";
import { 
  getPatientById,
  getICD10Subset,
  getMedicationCatalog,
  getLabTestCatalog
} from "@/lib/data/api";
import { EncounterEditor } from "@/components/features/encounters/EncounterEditor";

export default async function NewEncounterPage({ params, searchParams }: { params: { patientId: string }, searchParams: { appointmentId?: string } }) {
  const { patientId } = await params;
  const { appointmentId } = await searchParams; // next 15 pattern
  
  const [patient, icd10Catalog, medicationsCatalog, labTestsCatalog] = await Promise.all([
    getPatientById(patientId),
    getICD10Subset(),
    getMedicationCatalog(),
    getLabTestCatalog()
  ]);

  if (!patient) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto">
      <EncounterEditor 
        patient={patient} 
        appointmentId={appointmentId}
        icd10Catalog={icd10Catalog}
        medicationsCatalog={medicationsCatalog}
        labTestsCatalog={labTestsCatalog}
      />
    </div>
  );
}
