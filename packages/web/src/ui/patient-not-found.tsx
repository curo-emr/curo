import Link from "next/link";
import { UserX } from "lucide-react";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

/** A patient route's `not-found.tsx` screen, with a way back to the portal's patient list. */
export function PatientNotFound({ href }: { href: string }) {
  return (
    <EmptyState
      icon={UserX}
      title="Patient not found"
      description="This record doesn't exist or may have been removed."
      action={<Button asChild variant="outline"><Link href={href}>Back to patients</Link></Button>}
      className="min-h-[60vh]"
    />
  );
}
