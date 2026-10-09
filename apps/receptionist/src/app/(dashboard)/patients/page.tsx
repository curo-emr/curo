"use client";

import { UserPlus } from "lucide-react";
import { PatientList } from "@/components/features/patients/PatientList";
import { PageHeader } from "@curo/web/ui/page-header";
import { Button } from "@curo/web/ui/button";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";

export default function PatientsDirectoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Patients" description="Everyone registered at the clinic, newest first.">
        <Button asChild>
          <Link href={ROUTES.NEW_PATIENT}>
            <UserPlus /> Register patient
          </Link>
        </Button>
      </PageHeader>

      {/* PatientList fetches its own paginated data. */}
      <PatientList />
    </div>
  );
}
