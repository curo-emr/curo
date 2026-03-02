"use client";

import { useState } from "react";
import { Task, LabOrder, Patient } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, FlaskConical, Users, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Props {
  tasks: Task[];
  pendingLabs: LabOrder[];
  patients: Patient[];
}

export function DashboardSidebar({ tasks, pendingLabs, patients }: Props) {
  const [resolvedTaskIds, setResolvedTaskIds] = useState<Set<string>>(new Set());

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.name.full || "Unknown Patient";

  const visibleTasks = tasks.filter(t => !resolvedTaskIds.has(t.id));

  const resolveTask = (id: string) => {
    setResolvedTaskIds(prev => new Set([...prev, id]));
  };

  return (
    <div className="space-y-6">

      {/* Tasks & Messages */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Tasks & Messages
            {visibleTasks.length > 0 && (
              <Badge variant="secondary" className="ml-auto bg-amber-50 text-amber-700 hover:bg-amber-50">
                {visibleTasks.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {visibleTasks.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-300" />
                All tasks resolved.
              </div>
            ) : (
              visibleTasks.map(task => (
                <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <Link
                      href={task.relatedPatientId ? `/patients/${task.relatedPatientId}` : '#'}
                      className="font-medium text-sm hover:underline hover:text-blue-600 line-clamp-1"
                    >
                      {task.title}
                    </Link>
                    {task.priority === 'high' && (
                      <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] uppercase shrink-0">High</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Due: {task.dueDate}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2 text-blue-600 hover:text-blue-700"
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
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5 text-indigo-500" />
            Pending Labs
            {pendingLabs.length > 0 && (
              <Badge variant="secondary" className="ml-auto bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                {pendingLabs.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {pendingLabs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No pending lab results to review.</div>
            ) : (
              pendingLabs.map(lab => (
                <div key={lab.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="font-medium text-sm">{getPatientName(lab.patientId)}</span>
                    {lab.priority === 'urgent' && (
                      <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] uppercase shrink-0">Urgent</Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mb-2">
                    {lab.tests.length} test{lab.tests.length !== 1 ? 's' : ''} pending • Ordered {lab.createdAt.split('T')[0]}
                  </div>
                  <Link href={`/patients/${lab.patientId}?tab=labs`}>
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
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-emerald-500" />
            Recent Patients
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4 text-sm">
            {patients.slice(0, 3).map(p => (
              <Link key={p.id} href={`/patients/${p.id}`} className="flex items-center justify-between hover:bg-slate-50 p-2 -mx-2 rounded-md transition-colors">
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
