import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { formatAgeSex } from "@curo/web/format";
import { Badge } from "@curo/web/ui/badge";
import { Card } from "@curo/web/ui/card";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { Skeleton } from "@curo/web/ui/skeleton";
import { cn, formatAllergies } from "@/lib/utils";
import type { Allergy, Patient } from "@/types";

interface PatientSummaryCardProps {
  patient: Patient;
  /** Null when they couldn't be loaded, which must never read as none; undefined while they load. */
  allergies: Allergy[] | null | undefined;
  /** Where the name links to, such as the patient's page. */
  href?: string;
}

// Pharmacy sees only the identity needed for dispensing — no NIC, blood type,
// contact, or address (data minimization) — plus allergies for safe dispensing.
export function PatientSummaryCard({ patient, allergies, href }: PatientSummaryCardProps) {
  const name = (
    <h2 className={cn("truncate text-xl font-semibold tracking-tight text-foreground", href && "group-hover:text-primary")}>
      {patient.name.full}
    </h2>
  );

  return (
    <Card className="flex-row items-start gap-4 p-5">
      <InitialsAvatar name={patient.name.full} size="lg" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {href ? <Link href={href} className="group min-w-0">{name}</Link> : name}
          <Badge variant="outline" className="font-mono font-normal text-muted-foreground">{patient.mrn}</Badge>
          {patient.phn && (
            <Badge variant="outline" className="font-mono font-normal text-muted-foreground" title="Personal Health Number">
              PHN {patient.phn}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{formatAgeSex(patient.dob, patient.sex)}</p>
        <AllergyLine allergies={allergies} />
      </div>
    </Card>
  );
}

function AllergyLine({ allergies }: Pick<PatientSummaryCardProps, "allergies">) {
  if (allergies === undefined) return <Skeleton className="mt-2 h-8 w-56" />;
  if (allergies === null) return <AllergyWarning>Allergies couldn&apos;t be loaded</AllergyWarning>;
  if (allergies.length === 0) return <p className="pt-1 text-sm text-muted-foreground">No recorded allergies</p>;
  return <AllergyWarning>Allergies: {formatAllergies(allergies)}</AllergyWarning>;
}

const AllergyWarning = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-2 inline-flex items-center gap-2 rounded-lg border border-status-error-border bg-status-error-bg px-3 py-1.5 text-sm font-medium text-status-error-text">
    <TriangleAlert className="size-4 shrink-0" />
    {children}
  </p>
);
