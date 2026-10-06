import { PageHeader } from "@/components/ui/PageHeader";
import { PatientRegistrationForm } from "@/components/features/patients/PatientRegistrationForm";
import { ROUTES } from "@/lib/constants";

export default function NewPatientPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader back={{ href: ROUTES.PATIENTS, label: "Patients" }} title="Register a patient" description="Fill in the patient's details to create their record." />
      <PatientRegistrationForm />
    </div>
  );
}
