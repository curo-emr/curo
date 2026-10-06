import { Suspense } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/PageHeader";
import { PatientList } from "@/components/features/patients/PatientList";
import { ROUTES } from "@/lib/constants";

export default function PatientsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Patients" description="Search the patient register or add a new patient.">
        <Button asChild>
          <Link href={ROUTES.NEW_PATIENT}><UserPlus /> Add patient</Link>
        </Button>
      </PageHeader>
      {/* PatientList reads ?q= (useSearchParams needs a Suspense boundary). */}
      <Suspense>
        <PatientList />
      </Suspense>
    </div>
  );
}
