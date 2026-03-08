"use client";

import { Patient, Encounter, Problem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import Link from "next/link";
import { ChevronRight, Pill, Activity, Calendar } from "lucide-react";

interface OverviewTabProps {
  patient: Patient;
  encounters: Encounter[];
  problems: Problem[];
  setActiveTab: (tab: string) => void;
}

export function OverviewTab({ patient, encounters, problems, setActiveTab }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Active Problems
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {problems.filter(p => p.status === 'active').length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No active problems.</div>
            ) : (
              problems.filter(p => p.status === 'active').map(p => (
                <div key={p.id} className="p-4 text-sm hover:bg-muted">
                  <div className="font-medium text-foreground">{p.name}</div>
                  <div className="text-muted-foreground text-xs mt-1">ICD: {p.icdCode} • Onset: {formatDate(p.onsetDate)}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-4 w-4 text-status-success-text" /> Current Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {patient.currentMedications.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No current medications on file.</div>
            ) : (
              <div className="p-4 text-sm flex gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-status-success-bg text-status-success-text border-status-success-border">{patient.currentMedications.length} Active Meds</Badge>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-primary px-2" onClick={() => setActiveTab("medications")}>
                  View Medications →
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border md:col-span-2">
        <CardHeader className="bg-muted/50 border-b pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Recent Encounters
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-primary px-2" onClick={() => setActiveTab("encounters")}>
            View All →
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {encounters.slice(0, 3).map(e => (
              <Link key={e.id} href={ROUTES.ENCOUNTER(patient.id, e.id)} className="flex items-center justify-between p-4 hover:bg-muted transition-colors group">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground group-hover:text-primary">{formatDate(e.startedAt)}</span>
                    <StatusBadge status={e.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{e.chiefComplaint}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </Link>
            ))}
            {encounters.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">No past encounters.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
