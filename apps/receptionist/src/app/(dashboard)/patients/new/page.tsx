import { PageHeader } from "@curo/web/ui/page-header";
import { PatientRegistrationForm } from "@/components/features/patients/PatientRegistrationForm";
import { ROUTES } from "@/lib/constants";

export default function NewPatientPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Register a patient"
        description="Fill in the patient's details to create their record."
        back={{ href: ROUTES.PATIENTS, label: "All patients" }}
      />
      <PatientRegistrationForm />
    </div>
  );
}
