"use client";

import { UserPlus } from "lucide-react";
import { PatientList } from "@/components/features/patients/PatientList";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@curo/web/ui/button";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";

export default function PatientsDirectoryPage() {
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

      {/* PatientList fetches its own paginated data. */}
      <PatientList />
    </div>
  );
}
