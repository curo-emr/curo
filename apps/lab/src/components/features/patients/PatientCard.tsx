import Link from "next/link";
import { formatAgeSex } from "@curo/web/format";
import { Badge } from "@curo/web/ui/badge";
import { Card } from "@curo/web/ui/card";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import type { Patient } from "@/types";

// The lab sees only the identity needed to label a sample: no blood type,
// contact or address (data minimization).
export function PatientCard({ patient, href }: { patient: Patient; href?: string }) {
  const name = <span className="block truncate text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">{patient.name.full}</span>;

  return (
    <Card className="flex-row items-center gap-4 p-5">
      <InitialsAvatar name={patient.name.full} size="lg" />
      <div className="min-w-0 flex-1 space-y-1">
        {href ? <Link href={href} className="group block">{name}</Link> : <h1>{name}</h1>}
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{formatAgeSex(patient.dob, patient.sex)}</span>
          <Badge variant="outline" className="font-mono font-normal text-muted-foreground">{patient.mrn}</Badge>
          {patient.phn && (
            <Badge variant="outline" className="font-mono font-normal text-muted-foreground" title="Personal Health Number">
              PHN {patient.phn}
            </Badge>
          )}
        </p>
      </div>
    </Card>
  );
}
