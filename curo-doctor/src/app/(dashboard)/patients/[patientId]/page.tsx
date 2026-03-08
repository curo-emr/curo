import { notFound } from "next/navigation";
import {
  getPatientById,
  getEncountersByPatient,
  getAllergies,
  getProblems,
  getLabOrdersByPatient,
  getPrescriptionsByPatient,
  getLabTestCatalog
} from "@/lib/data/api";
import { calculateAge } from "@/lib/utils";
import { PatientHeader } from "@/components/features/patients/PatientHeader";
import { PatientChartTabs } from "@/components/features/patients/PatientChartTabs";

export default async function PatientChartPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  
  const patient = await getPatientById(patientId);
  if (!patient) notFound();

  const age = calculateAge(patient.dob);

  const [encounters, allergies, problems, labOrders, prescriptions, labTestCatalog] = await Promise.all([
    getEncountersByPatient(patientId),
    getAllergies(patientId),
    getProblems(patientId),
    getLabOrdersByPatient(patientId),
    getPrescriptionsByPatient(patientId),
    getLabTestCatalog(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PatientHeader patient={patient} allergies={allergies} age={age} />

      <PatientChartTabs 
        patient={patient} 
        encounters={encounters} 
        allergies={allergies} 
        problems={problems} 
        labOrders={labOrders} 
        prescriptions={prescriptions}
        labTestCatalog={labTestCatalog}
      />
    </div>
  );
}
