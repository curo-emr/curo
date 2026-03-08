import { Suspense } from "react";
import { getPatients, getAllAllergies } from "@/lib/data/api";
import { PatientList } from "@/components/features/patients/PatientList";
import { PageHeader } from "@/components/ui/PageHeader";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";

export default async function PatientsDirectoryPage() {
  const [patients, allergies] = await Promise.all([
    getPatients(),
    getAllAllergies(),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader title="Patients" description="Search and manage patient records">
        <Link href={ROUTES.NEW_PATIENT}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Register Patient
          </Button>
        </Link>
      </PageHeader>

      <Suspense
        fallback={
          <div className="p-8 text-center text-slate-500">
            Loading patients...
          </div>
        }
      >
        <PatientList patients={patients} allergies={allergies} />
      </Suspense>
    </div>
  );
}
