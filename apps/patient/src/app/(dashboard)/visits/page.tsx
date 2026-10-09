"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ArrowRight } from "lucide-react";
import { QueryContent } from "@curo/web/query";
import { MyRecord } from "@/components/features/MyRecord";
import { useDoctors } from "@/lib/hooks/useDoctors";
import { myQueries } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import Link from "next/link";
import { formatDate, getDoctorName } from "@/lib/utils";
import type { Encounter } from "@/types";
import { ROUTES } from "@/lib/constants";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { PageHeader } from "@curo/web/ui/page-header";
import { EmptyState } from "@curo/web/ui/empty-state";
import type { Doctor } from "@/lib/api/patient-portal";

export default function VisitsPage() {
  return <MyRecord>{patient => <Visits patientId={patient.id} />}</MyRecord>;
}

function Visits({ patientId }: { patientId: string }) {
  const doctors = useDoctors();
  const list = useQuery(myQueries.encounters(patientId));

  return (
    <QueryContent query={list} what="your visits">
      {encounters => <VisitList encounters={encounters} doctors={doctors} />}
    </QueryContent>
  );
}

function VisitList({ encounters, doctors }: { encounters: Encounter[]; doctors: Doctor[] }) {
  const completedVisits = encounters.filter(e => e.status === "completed");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Visit History"
        description="Review your past clinical visits and encounter details."
      />

      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              Past Visits
            </CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
              {completedVisits.length} visit{completedVisits.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {completedVisits.length === 0 ? (
              <EmptyState title="No visit records found." />
            ) : (
              completedVisits.map(enc => (
                <Link
                  key={enc.id}
                  href={ROUTES.VISIT(enc.id)}
                  className="block p-4 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                          {enc.chiefComplaint}
                        </p>
                        <StatusBadge status={enc.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getDoctorName(enc.doctorId, doctors)} &middot; {formatDate(enc.startedAt)}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {enc.diagnoses.length > 0 && (
                          <span>{enc.diagnoses.length} diagnosis{enc.diagnoses.length !== 1 ? "es" : ""}</span>
                        )}
                        {enc.prescriptionIds.length > 0 && (
                          <span>{enc.prescriptionIds.length} prescription{enc.prescriptionIds.length !== 1 ? "s" : ""}</span>
                        )}
                        {enc.labOrderIds.length > 0 && (
                          <span>{enc.labOrderIds.length} lab order{enc.labOrderIds.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
