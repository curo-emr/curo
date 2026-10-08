"use client";

import { useState, useEffect } from "react";
import { Loader2, HeartPulse, AlertTriangle, Pill, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { formatDate } from "@/lib/utils";
import { formatStatus } from "@curo/web/format";
import { PageHeader } from "@curo/web/ui/page-header";
import { EmptyState } from "@curo/web/ui/empty-state";
import { getMyProfile, getMyAllergies, getMyConditions, getMyPrescriptions } from "@/lib/api/patient-portal";
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
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Empty lists would read as "no known allergies", so a failed load gets its own state.
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    getMyProfile().then(async pt => {
      if (!pt) { setIsLoading(false); return; }
      const [alg, probs, rxs] = await Promise.all([
        getMyAllergies(pt.id),
        getMyConditions(pt.id),
        getMyPrescriptions(pt.id),
      ]);
      setAllergies(alg);
      setProblems(probs);
      setPrescriptions(rxs);
    }).catch(() => setLoadFailed(true)).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (loadFailed) {
    return <EmptyState icon={ShieldAlert} title="Couldn't load your health records" description="Check your connection and try again." className="min-h-[50vh]" />;
  }

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
