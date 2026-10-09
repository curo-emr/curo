"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Pill } from "lucide-react";
import { QueryContent, allOf } from "@curo/web/query";
import { PharmacyDashboardStats } from "@/components/features/dashboard/PharmacyDashboardStats";
import { PendingPrescriptionsList } from "@/components/features/dashboard/PendingPrescriptionsList";
import { RecentDispensingFeed } from "@/components/features/dashboard/RecentDispensingFeed";
import { LowStockAlerts } from "@/components/features/dashboard/LowStockAlerts";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { dispensingQueries, patientQueries, prescriptionQueries, stockQueries } from "@/lib/queries";
import type { DispenseRecord, GroupedStock, StockItem } from "@/lib/api/pharmacy";
import type { Patient, Prescription } from "@/types";

const RECENT_LIMIT = 8;
// One empty list for "not loaded yet", so the lists' memos don't recompute on every render.
const NO_PATIENTS: Patient[] = [];

export default function DashboardPage() {
  const dashboard = allOf(
    useQuery(prescriptionQueries.pending()),
    useQuery(stockQueries.batches()),
    useQuery(stockQueries.lowStock()),
    useQuery(dispensingQueries.recent(RECENT_LIMIT)),
  );

  return (
    <QueryContent query={dashboard} what="the dashboard">
      {([prescriptions, medications, lowStock, dispensingRecords]) => (
        <Dashboard prescriptions={prescriptions} medications={medications} lowStock={lowStock} dispensingRecords={dispensingRecords} />
      )}
    </QueryContent>
  );
}

interface DashboardProps {
  prescriptions: Prescription[];
  medications: StockItem[];
  lowStock: GroupedStock[];
  dispensingRecords: DispenseRecord[];
}

function Dashboard({ prescriptions, medications, lowStock, dispensingRecords }: DashboardProps) {
  // One lookup names everyone in the pending list and the dispensing feed.
  const patients = useQuery(patientQueries.byIds([...prescriptions, ...dispensingRecords].map(x => x.patientId))).data ?? NO_PATIENTS;

  const today = new Date();
  const dateHeading = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const expiringMeds = medications.filter(m => {
    const expiry = new Date(m.expiryDate);
    const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 90 && diffDays >= 0 && m.isActive;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pharmacy Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{dateHeading}</p>
        </div>
      </div>

      <PharmacyDashboardStats prescriptions={prescriptions} lowStockCount={lowStock.length} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PendingPrescriptionsList prescriptions={prescriptions} patients={patients} />
          <RecentDispensingFeed records={dispensingRecords} patients={patients} />
        </div>

        <div className="space-y-6">
          <LowStockAlerts drugs={lowStock} />

          {/* Expiring Soon */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Pill className="h-4 w-4 text-amber-600" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {expiringMeds.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No medications expiring within 90 days.</div>
              ) : (
                <div className="divide-y">
                  {expiringMeds.slice(0, 5).map(med => {
                    const expDays = Math.floor((new Date(med.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={med.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{med.genericName}</span>
                          <Badge variant="outline" className="bg-status-warning-bg text-status-warning-text border-status-warning-border">
                            {expDays}d left
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {med.brandName} {med.strength} &middot; Batch: {med.batchNumber}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-blue-600" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Patients</span>
                  <span className="text-sm font-medium text-foreground">{patients.length}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Prescriptions</span>
                  <span className="text-sm font-medium text-foreground">{prescriptions.length}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Medications in Catalog</span>
                  <span className="text-sm font-medium text-foreground">{medications.length}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dispensing Records</span>
                  <span className="text-sm font-medium text-foreground">{dispensingRecords.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
