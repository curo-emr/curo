import { PageHeader } from "@curo/web/ui/page-header";
import { PatientList } from "@/components/features/patients/PatientList";

export default function PatientsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Patients" description="Look up a patient's lab orders and results." />
      <PatientList />
    </div>
  );
}
