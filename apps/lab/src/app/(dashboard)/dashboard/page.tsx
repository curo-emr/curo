"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Cpu } from "lucide-react";
import { QueryContent, allOf } from "@curo/web/query";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { LabDashboardStats } from "@/components/features/dashboard/LabDashboardStats";
import { UrgentOrdersList } from "@/components/features/dashboard/UrgentOrdersList";
import { RecentActivityFeed } from "@/components/features/dashboard/RecentActivityFeed";
import type { LabInstrument, LabOrderSummary } from "@/lib/api/lab";
import { labQueries, orderQueries, patientQueries } from "@/lib/queries";
import type { LabOrder, Patient, QCLog } from "@/types";

const URGENT_LIMIT = 10;
const RECENT_LIMIT = 8;
const QC_ALERT_LIMIT = 5;
const NO_PATIENTS: Patient[] = [];

export default function DashboardPage() {
  const dashboard = allOf(
    useQuery(orderQueries.summary()),
    // Urgent orders still waiting on the lab, most urgent first.
    useQuery(orderQueries.page({ page: 1, pageSize: URGENT_LIMIT, status: "sent_to_lab", priorities: ["stat", "urgent"], sort: "priority" })),
    useQuery(orderQueries.page({ page: 1, pageSize: RECENT_LIMIT, sort: "newest" })),
    useQuery(labQueries.instruments()),
    useQuery(labQueries.qcAlerts(QC_ALERT_LIMIT)),
  );

  return (
    <QueryContent query={dashboard} what="the dashboard">
      {([summary, urgent, recentPage, instruments, qcAlerts]) => (
        <Dashboard summary={summary} urgent={urgent} recent={recentPage.items} instruments={instruments} qcAlerts={qcAlerts} />
      )}
    </QueryContent>
  );
}

interface DashboardProps {
  summary: LabOrderSummary;
  urgent: { items: LabOrder[]; total: number };
  recent: LabOrder[];
  instruments: LabInstrument[];
  qcAlerts: { items: QCLog[]; total: number };
}

function Dashboard({ summary, urgent, recent, instruments, qcAlerts }: DashboardProps) {
  // One lookup names everyone in the urgent and recent lists.
  const patients = useQuery(patientQueries.byIds([...urgent.items, ...recent].map(o => o.patientId))).data ?? NO_PATIENTS;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Laboratory Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <LabDashboardStats counts={summary.byStatus} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <UrgentOrdersList orders={urgent.items} total={urgent.total} patients={patients} />
          <RecentActivityFeed orders={recent} patients={patients} />
        </div>

        <div className="space-y-6">
          {/* QC Alerts */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                QC Alerts
              </CardTitle>
              {qcAlerts.total > 0 && (
                <Badge variant="secondary" className="bg-status-warning-bg text-status-warning-text hover:bg-status-warning-bg">
                  {qcAlerts.total} open
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {qcAlerts.total === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">All QC checks passing.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {qcAlerts.items.map(log => (
                    <div key={log.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{log.testCode} · {log.controlLevel}</span>
                        <StatusBadge status={log.status} />
                      </div>
                      <p className="text-xs text-slate-500">{log.notes || `Expected: ${log.expectedValue}, Got: ${log.observedValue} ${log.unit}`}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instrument Status */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="h-4 w-4 text-blue-600" />
                Instrument Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {instruments.map(inst => (
                  <div key={inst.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{inst.name}</p>
                      <p className="text-xs text-slate-400">{inst.model} {inst.location ? `— ${inst.location}` : ''}</p>
                    </div>
                    <Badge variant="outline" className={
                      inst.status === 'operational' ? 'text-green-700 border-green-200 bg-green-50' :
                      inst.status === 'maintenance' ? 'text-amber-700 border-amber-200 bg-amber-50' :
                      'text-red-700 border-red-200 bg-red-50'
                    }>
                      {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
