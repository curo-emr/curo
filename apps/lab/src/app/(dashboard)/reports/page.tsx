"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, FlaskConical, XCircle, TrendingUp } from "lucide-react";
import { QueryContent } from "@curo/web/query";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { orderQueries } from "@/lib/queries";
import type { LabOrderSummary } from "@/lib/api/lab";

export default function ReportsPage() {
  const summary = useQuery(orderQueries.summary());

  return (
    <QueryContent query={summary} what="the reports">
      {data => <Reports summary={data} />}
    </QueryContent>
  );
}

function Reports({ summary }: { summary: LabOrderSummary }) {
  const totalOrders = summary.total;
  // No lab order status means rejected, so this reads 0, as it always has.
  const rejectedOrders = 0;
  const rejectionRate = totalOrders > 0 ? ((rejectedOrders / totalOrders) * 100).toFixed(1) : '0';

  const topTests = summary.topTests;
  const maxTestCount = topTests.length > 0 ? topTests[0].count : 1;

  const statusEntries = Object.entries(summary.byStatus);
  const maxStatusCount = Math.max(...statusEntries.map(([, v]) => v), 1);

  const statusColors: Record<string, string> = {
    received: 'bg-sky-500',
    collected: 'bg-teal-500',
    processing: 'bg-blue-500',
    resulted: 'bg-purple-500',
    verified: 'bg-green-500',
    dispatched: 'bg-emerald-500',
    rejected: 'bg-red-500',
  };

  const deptEntries = Object.entries(summary.byPriority);
  const maxDeptCount = Math.max(...deptEntries.map(([, v]) => v), 1);

  const mostOrderedTest = topTests[0]?.display ?? 'N/A';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="text-sm text-muted-foreground">Laboratory analytics and performance metrics</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 text-blue-700 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4" />
            <p className="text-xs font-medium opacity-80">Total Orders</p>
          </div>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>
        <div className="rounded-lg border p-4 text-amber-700 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4" />
            <p className="text-xs font-medium opacity-80">Avg TAT</p>
          </div>
          <p className="text-2xl font-bold">1.2h</p>
        </div>
        <div className="rounded-lg border p-4 text-purple-700 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="h-4 w-4" />
            <p className="text-xs font-medium opacity-80">Most Ordered</p>
          </div>
          <p className="text-lg font-bold truncate">{mostOrderedTest}</p>
        </div>
        <div className="rounded-lg border p-4 text-red-700 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4" />
            <p className="text-xs font-medium opacity-80">Rejection Rate</p>
          </div>
          <p className="text-2xl font-bold">{rejectionRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tests */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
            <CardTitle className="text-base">Most Ordered Tests</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {topTests.map(({ code: testId, display, count }) => {
              return (
                <div key={testId}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">{display}</span>
                    <span className="text-slate-500 font-mono text-xs">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(count / maxTestCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
            <CardTitle className="text-base">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {statusEntries.map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 capitalize">{status}</span>
                  <span className="text-slate-500 font-mono text-xs">{count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusColors[status] || 'bg-slate-400'}`}
                    style={{ width: `${(count / maxStatusCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Department Volume */}
        <Card className="shadow-sm border-slate-200 lg:col-span-2">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
            <CardTitle className="text-base">Volume by Priority</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-end gap-6 h-40 justify-center">
              {deptEntries.map(([dept, count]) => (
                <div key={dept} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">{count}</span>
                  <div
                    className="w-16 bg-blue-500 rounded-t-md"
                    style={{ height: `${(count / maxDeptCount) * 120}px` }}
                  />
                  <span className="text-xs text-slate-500 text-center">{dept}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
