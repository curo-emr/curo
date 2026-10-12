import Link from "next/link";
import { FileX, UserX, type LucideIcon } from "lucide-react";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

interface RecordNotFoundProps {
  /** What's missing, e.g. "Order": the title reads "Order not found". */
  record: string;
  /** The list the record would be in. */
  href: string;
  /** The way back, e.g. "Back to worklist". */
  backLabel: string;
  icon?: LucideIcon;
}

/** A record route's `not-found.tsx` screen, with a way back to the list it belongs to. */
export function RecordNotFound({ record, href, backLabel, icon = FileX }: RecordNotFoundProps) {
  return (
    <EmptyState
      icon={icon}
      title={`${record} not found`}
      description="This record doesn't exist or may have been removed."
      action={<Button asChild variant="outline"><Link href={href}>{backLabel}</Link></Button>}
      className="min-h-[60vh]"
    />
  );
}

/** `RecordNotFound` for a patient route. */
export function PatientNotFound({ href }: { href: string }) {
  return <RecordNotFound record="Patient" href={href} backLabel="Back to patients" icon={UserX} />;
}
