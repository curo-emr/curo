"use client";

import { useState } from "react";
import { Task, LabOrder, Patient } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, FlaskConical, Users, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getPatientName } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";

interface Props {
  tasks: Task[];
  pendingLabs: LabOrder[];
  patients: Patient[];
}

export function DashboardSidebar({ tasks, pendingLabs, patients }: Props) {
  const [resolvedTaskIds, setResolvedTaskIds] = useState<Set<string>>(new Set());

  const visibleTasks = tasks.filter(t => !resolvedTaskIds.has(t.id));

  const resolveTask = (id: string) => {
    setResolvedTaskIds(prev => new Set([...prev, id]));
  };

  return (
    <div className="space-y-6">

      {/* Tasks & Messages */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-status-warning-text" />
            Tasks & Messages
            {visibleTasks.length > 0 && (
              <Badge variant="secondary" className="ml-auto bg-status-warning-bg text-status-warning-text hover:bg-status-warning-bg">
                {visibleTasks.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {visibleTasks.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-status-success-text" />
                All tasks resolved.
              </div>
            ) : (
              visibleTasks.map(task => (
                <div key={task.id} className="p-4 hover:bg-muted transition-colors">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <Link
                      href={task.relatedPatientId ? ROUTES.PATIENT(task.relatedPatientId) : '#'}
                      className="font-medium text-sm hover:underline hover:text-primary line-clamp-1"
                    >
                      {task.title}
                    </Link>
                    {task.priority === 'high' && (
                      <Badge className="bg-status-error-bg text-status-error-text border-status-error-border text-[10px] uppercase shrink-0">High</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Due: {task.dueDate}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2 text-primary hover:text-primary"
                      onClick={() => resolveTask(task.id)}
                    >
                      ✓ Resolve
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Labs */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5 text-primary" />
            Pending Labs
            {pendingLabs.length > 0 && (
              <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary hover:bg-primary/10">
                {pendingLabs.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {pendingLabs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No pending lab results to review.</div>
            ) : (
              pendingLabs.map(lab => (
                <div key={lab.id} className="p-4 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="font-medium text-sm">{getPatientName(lab.patientId, patients)}</span>
                    {lab.priority === 'urgent' && (
                      <Badge className="bg-status-error-bg text-status-error-text border-status-error-border text-[10px] uppercase shrink-0">Urgent</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {lab.tests.length} test{lab.tests.length !== 1 ? 's' : ''} pending • Ordered {lab.createdAt.split('T')[0]}
                  </div>
                  <Link href={`${ROUTES.PATIENT(lab.patientId)}?tab=labs`}>
                    <Button variant="outline" size="sm" className="w-full text-xs h-7">
                      Review Results
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Patients */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-status-success-text" />
            Recent Patients
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4 text-sm">
            {patients.slice(0, 3).map(p => (
              <Link key={p.id} href={ROUTES.PATIENT(p.id)} className="flex items-center justify-between hover:bg-muted p-2 -mx-2 rounded-md transition-colors">
                <span className="font-medium">{p.name.full}</span>
                <span className="text-muted-foreground text-xs">{p.mrn}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
