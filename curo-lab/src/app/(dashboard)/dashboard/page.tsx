import { getLabOrders, getUrgentLabOrders, getPatients, getLabTestCatalog, getQCLogs, getLabInstruments } from "@/lib/data/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LabDashboardStats } from "@/components/features/dashboard/LabDashboardStats";
import { UrgentOrdersList } from "@/components/features/dashboard/UrgentOrdersList";
import { RecentActivityFeed } from "@/components/features/dashboard/RecentActivityFeed";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AlertTriangle, Activity, Cpu } from "lucide-react";

export default async function DashboardPage() {
  const [orders, urgentOrders, patients, testCatalog, qcLogs, instruments] = await Promise.all([
    getLabOrders(),
    getUrgentLabOrders(),
    getPatients(),
    getLabTestCatalog(),
    getQCLogs(),
    getLabInstruments(),
  ]);

  const today = new Date();
  const dateHeading = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const qcAlerts = qcLogs.filter(l => l.status === 'fail' || l.status === 'warning');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Laboratory Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{dateHeading}</p>
        </div>
      </div>

      <LabDashboardStats orders={orders} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <UrgentOrdersList orders={urgentOrders} patients={patients} testCatalog={testCatalog} />
          <RecentActivityFeed orders={orders} patients={patients} />
        </div>

        <div className="space-y-6">
          {/* QC Alerts */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                QC Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {qcAlerts.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">All QC checks passing.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {qcAlerts.slice(0, 5).map(log => (
                    <div key={log.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{log.testCode}</span>
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
                      <p className="text-xs text-slate-400">{inst.department} - {inst.location}</p>
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
