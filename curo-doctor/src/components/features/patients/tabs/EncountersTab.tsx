import { Patient, Encounter } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface EncountersTabProps {
  patient: Patient;
  encounters: Encounter[];
}

export function EncountersTab({ patient, encounters }: EncountersTabProps) {
  return (
    <>
      {encounters.map(e => (
        <Link key={e.id} href={ROUTES.ENCOUNTER(patient.id, e.id)} className="block">
          <Card className="shadow-sm border hover:border-primary/30 transition-colors group">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg text-foreground group-hover:text-primary">{formatDate(e.startedAt)}</h3>
                  <StatusBadge status={e.status} />
                </div>
                <p className="text-muted-foreground mb-2">{e.chiefComplaint}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {e.diagnoses.map(d => (
                    <Badge key={d.icdCode} variant="secondary" className="bg-muted text-muted-foreground text-xs">
                      {d.icdCode} — {d.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </CardContent>
          </Card>
        </Link>
      ))}
      {encounters.length === 0 && (
        <div className="py-12 text-center text-muted-foreground bg-muted rounded-lg border border-dashed">
          No encounters found for this patient.
        </div>
      )}
    </>
  );
}
