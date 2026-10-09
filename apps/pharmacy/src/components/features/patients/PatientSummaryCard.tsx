import { User, AlertTriangle } from "lucide-react";
import { Skeleton } from "@curo/web/ui/skeleton";
import { Card, CardContent } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { calculateAge, formatAllergies } from "@/lib/utils";
import type { Allergy, Patient } from "@/types";

interface PatientSummaryCardProps {
  patient: Patient;
  /** Null when they couldn't be loaded, which must never read as none; undefined while they load. */
  allergies: Allergy[] | null | undefined;
}

// Pharmacy sees only the identity needed for dispensing — no NIC, blood type,
// contact, or address (data minimization) — plus allergies for safe dispensing.
export function PatientSummaryCard({ patient, allergies }: PatientSummaryCardProps) {
  return (
    <Card className="shadow-sm border">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-slate-900">{patient.name.full}</h2>
              <Badge variant="outline" className="text-slate-600">{patient.mrn}</Badge>
              {patient.phn && <Badge variant="outline" className="text-slate-600" title="Personal Health Number">PHN {patient.phn}</Badge>}
            </div>
            <div className="text-sm text-slate-500">
              {calculateAge(patient.dob)}y / {patient.sex.charAt(0).toUpperCase()}{patient.sex.slice(1)}
            </div>
            <AllergyLine allergies={allergies} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AllergyLine({ allergies }: Pick<PatientSummaryCardProps, "allergies">) {
  if (allergies === undefined) return <Skeleton className="h-5 w-48 mt-2" />;
  if (allergies === null) return <AllergyWarning>Allergies couldn&apos;t be loaded</AllergyWarning>;
  if (allergies.length === 0) return <p className="text-sm text-muted-foreground mt-2">No recorded allergies</p>;
  return <AllergyWarning>Allergies: {formatAllergies(allergies)}</AllergyWarning>;
}

const AllergyWarning = ({ children }: { children: React.ReactNode }) => (
  <p className="flex items-center gap-2 mt-2 text-sm font-medium text-status-error-text">
    <AlertTriangle className="h-4 w-4 shrink-0" />
    {children}
  </p>
);
