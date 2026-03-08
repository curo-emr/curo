import { notFound } from "next/navigation";
import {
  getPatientById,
  getAllergies,
  getAppointmentsByPatient,
  getVisitsByPatient,
  getDoctors,
} from "@/lib/data/api";
import { PatientHeader } from "@/components/features/patients/PatientHeader";
import { PatientChartTabs } from "@/components/features/patients/PatientChartTabs";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  const patient = await getPatientById(patientId);
  if (!patient) notFound();

  const [allergies, appointments, visits, doctors] = await Promise.all([
    getAllergies(patientId),
    getAppointmentsByPatient(patientId),
    getVisitsByPatient(patientId),
    getDoctors(),
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PatientHeader patient={patient} allergies={allergies} />

      <PatientChartTabs
        patient={patient}
        allergies={allergies}
        appointments={appointments}
        visits={visits}
        doctors={doctors}
      />
    </div>
  );
}
