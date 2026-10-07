import Link from "next/link";
import { UserX } from "lucide-react";
import { Button } from "@curo/web/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROUTES } from "@/lib/constants";

export default function PatientNotFound() {
  return (
    <EmptyState
      icon={UserX}
      title="Patient not found"
      description="This record doesn't exist or may have been removed."
      action={<Button asChild variant="outline"><Link href={ROUTES.PATIENTS}>Back to patients</Link></Button>}
      className="min-h-[60vh]"
    />
  );
}
