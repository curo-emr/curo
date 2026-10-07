"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Clock, Pill, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { formatCurrency } from "@/lib/utils";
import { formatStatus } from "@curo/web/format";
import { getPendingPrescriptions, getDispensingRecords, getStock, type DispenseRecord, type StockItem } from "@/lib/api/pharmacy";
import type { Prescription } from "@/types";

export default function ReportsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medications, setMedications] = useState<StockItem[]>([]);
  const [dispensingRecords, setDispensingRecords] = useState<DispenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPendingPrescriptions(), getStock(), getDispensingRecords()])
      .then(([rxs, meds, records]) => { setPrescriptions(rxs); setMedications(meds); setDispensingRecords(records); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  const totalPrescriptions = prescriptions.length;
  const cancelledCount = prescriptions.filter(p => p.status === 'cancelled').length;
  const cancellationRate = totalPrescriptions > 0 ? ((cancelledCount / totalPrescriptions) * 100).toFixed(1) : '0';

  const totalRevenue = dispensingRecords.reduce((sum, r) => sum + r.totalAmount, 0);

  // Count dispensed medications
  const medCounts: Record<string, number> = {};
  for (const record of dispensingRecords) {
    for (const item of record.items) {
      medCounts[item.medicationName] = (medCounts[item.medicationName] || 0) + item.quantity;
    }
  }
  const topMeds = Object.entries(medCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const maxMedCount = topMeds.length > 0 ? topMeds[0][1] : 1;

  // Status distribution
  const statusCounts: Record<string, number> = {};
  for (const rx of prescriptions) {
    statusCounts[rx.status] = (statusCounts[rx.status] || 0) + 1;
  }
  const statusEntries = Object.entries(statusCounts);
  const maxStatusCount = Math.max(...statusEntries.map(([, v]) => v), 1);

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500',
    processing: 'bg-blue-500',
    dispensed: 'bg-green-500',
    partially_dispensed: 'bg-purple-500',
    on_hold: 'bg-teal-500',
    cancelled: 'bg-red-500',
    expired: 'bg-slate-400',
  };

  // Category distribution — based on form type from stock
  const catCounts: Record<string, number> = {};
  for (const med of medications) {
    const cat = med.form || 'other';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  const catEntries = Object.entries(catCounts);
  const maxCatCount = Math.max(...catEntries.map(([, v]) => v), 1);

  const mostDispensedMed = topMeds.length > 0 ? topMeds[0][0] : 'N/A';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="text-sm text-muted-foreground">Pharmacy analytics and performance metrics</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 text-blue-700 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4" />
            <p className="text-xs font-medium opacity-80">Total Prescriptions</p>
          </div>
          <p className="text-2xl font-bold">{totalPrescriptions}</p>
        </div>
        <div className="rounded-lg border p-4 text-green-700 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4" />
            <p className="text-xs font-medium opacity-80">Total Revenue</p>
          </div>
          <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-lg border p-4 text-purple-700 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <Pill className="h-4 w-4" />
            <p className="text-xs font-medium opacity-80">Most Dispensed</p>
          </div>
          <p className="text-lg font-bold truncate">{mostDispensedMed}</p>
        </div>
        <div className="rounded-lg border p-4 text-red-700 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4" />
            <p className="text-xs font-medium opacity-80">Cancellation Rate</p>
          </div>
          <p className="text-2xl font-bold">{cancellationRate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Dispensed Medications */}
        <Card className="shadow-sm border">
          <CardHeader className="bg-muted/50 border-b pb-3">
            <CardTitle className="text-base">Most Dispensed Medications</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {topMeds.map(([medName, count]) => {
              return (
                <div key={medName}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700">{medName}</span>
                    <span className="text-slate-500 font-mono text-xs">{count} units</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / maxMedCount) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Prescription Status Distribution */}
        <Card className="shadow-sm border">
          <CardHeader className="bg-muted/50 border-b pb-3">
            <CardTitle className="text-base">Prescription Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {statusEntries.map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700">{formatStatus(status)}</span>
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

        {/* Medication Category Distribution */}
        <Card className="shadow-sm border lg:col-span-2">
          <CardHeader className="bg-muted/50 border-b pb-3">
            <CardTitle className="text-base">Medications by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-end gap-6 h-40 justify-center flex-wrap">
              {catEntries.map(([cat, count]) => (
                <div key={cat} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">{count}</span>
                  <div
                    className="w-16 bg-blue-500 rounded-t-md"
                    style={{ height: `${(count / maxCatCount) * 120}px` }}
                  />
                  <span className="text-xs text-slate-500 text-center">{formatStatus(cat)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
