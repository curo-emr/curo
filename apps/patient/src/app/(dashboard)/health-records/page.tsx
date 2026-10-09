"use client";

import { useQuery } from "@tanstack/react-query";
import { HeartPulse, AlertTriangle, Pill, ShieldAlert } from "lucide-react";
import { QueryContent, allOf } from "@curo/web/query";
import { MyRecord } from "@/components/features/MyRecord";
import { myQueries } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { formatDate } from "@/lib/utils";
import { formatStatus } from "@curo/web/format";
import { PageHeader } from "@curo/web/ui/page-header";
import { EmptyState } from "@curo/web/ui/empty-state";
import type { Allergy, Problem, Prescription } from "@/types";

function SeverityBadge({ severity }: { severity: string }) {
  switch (severity) {
    case "severe":
      return <Badge className="bg-status-error-bg text-status-error-text border-status-error-border">Severe</Badge>;
    case "moderate":
      return <Badge className="bg-status-warning-bg text-status-warning-text border-status-warning-border">Moderate</Badge>;
    case "mild":
      return <Badge className="bg-primary/10 text-primary border-primary/20">Mild</Badge>;
    default:
      return <Badge variant="outline">{formatStatus(severity)}</Badge>;
  }
}

export default function HealthRecordsPage() {
  return <MyRecord>{patient => <HealthRecords patientId={patient.id} />}</MyRecord>;
}

function HealthRecords({ patientId }: { patientId: string }) {
  // Loaded together: an empty list must never stand in for one that failed, such as "no known allergies".
  const record = allOf(
    useQuery(myQueries.allergies(patientId)),
    useQuery(myQueries.conditions(patientId)),
    useQuery(myQueries.prescriptions(patientId)),
  );

  return (
    <QueryContent query={record} what="your health records">
      {([allergies, problems, prescriptions]) => <Records allergies={allergies} problems={problems} prescriptions={prescriptions} />}
    </QueryContent>
  );
}

function Records({ allergies, problems, prescriptions }: { allergies: Allergy[]; problems: Problem[]; prescriptions: Prescription[] }) {
  const activeProblems = problems.filter(p => p.status === "active");
  const resolvedProblems = problems.filter(p => p.status !== "active");
  const latestRx = prescriptions[0];
  const currentMedications = latestRx?.items || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Health Records"
        description="Your allergies, active conditions, and current medications."
      />

      {/* Allergies */}
      <Card className="shadow-sm border-status-error-border">
        <CardHeader className="bg-status-error-bg/50 border-b border-status-error-border">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg text-status-error-text">
              <AlertTriangle className="h-5 w-5 text-status-error-text" />
              Allergies
            </CardTitle>
            {allergies.length > 0 && (
              <Badge variant="secondary" className="bg-status-error-bg text-status-error-text hover:bg-status-error-bg">
                {allergies.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-status-error-border">
            {allergies.length === 0 ? (
              <div className="p-6 text-center text-sm text-status-success-text">No known allergies (NKA).</div>
            ) : (
              allergies.map(allergy => (
                <div key={allergy.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-foreground">{allergy.substance}</p>
                        <SeverityBadge severity={allergy.severity} />
                      </div>
                      {allergy.reaction && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Reaction:</span> {allergy.reaction}
                        </p>
                      )}
                      {allergy.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{allergy.notes}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      Recorded: {formatDate(allergy.recordedAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Conditions */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HeartPulse className="h-5 w-5 text-status-warning-text" />
              Active Conditions
            </CardTitle>
            {activeProblems.length > 0 && (
              <Badge variant="secondary" className="bg-status-warning-bg text-status-warning-text hover:bg-status-warning-bg">
                {activeProblems.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {activeProblems.length === 0 ? (
              <EmptyState title="No active conditions." />
            ) : (
              activeProblems.map(problem => (
                <div key={problem.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{problem.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{problem.icdCode}</Badge>
                        <span>Onset: {formatDate(problem.onsetDate)}</span>
                      </div>
                      {problem.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{problem.notes}</p>
                      )}
                    </div>
                    <Badge className="bg-status-warning-bg text-status-warning-text border-status-warning-border shrink-0">Active</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resolved Conditions */}
      {resolvedProblems.length > 0 && (
        <Card className="shadow-sm border">
          <CardHeader className="bg-muted/50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" />
              Resolved / Inactive Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {resolvedProblems.map(problem => (
                <div key={problem.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm text-foreground">{problem.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{problem.icdCode} &middot; Onset: {formatDate(problem.onsetDate)}</p>
                    </div>
                    <Badge variant="outline" className="text-muted-foreground border shrink-0">
                      {formatStatus(problem.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Medications */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pill className="h-5 w-5 text-status-success-text" />
              Current Medications
            </CardTitle>
            {currentMedications.length > 0 && (
              <Badge variant="secondary" className="bg-status-success-bg text-status-success-text hover:bg-status-success-bg">
                {currentMedications.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {currentMedications.length === 0 ? (
              <EmptyState title="No current medications." />
            ) : (
              currentMedications.map(med => (
                <div key={med.id} className="p-4">
                  <p className="font-semibold text-sm text-foreground">{med.displayName}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {med.dose} &middot; {med.route} &middot; {med.frequency}
                  </p>
                  {med.instructions && (
                    <p className="text-xs text-muted-foreground mt-1">{med.instructions}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
