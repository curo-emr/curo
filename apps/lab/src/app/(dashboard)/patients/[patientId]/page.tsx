"use client";

import { useState, useEffect, use } from "react";
import { Loader2 } from "lucide-react";
import { getPatientById } from "@/lib/api/patients";
import { getLabOrdersByPatient, getLabResultsByPatient, type LabResult } from "@/lib/api/lab";
import { calculateAge, formatDate } from "@/lib/utils";
import type { Patient, LabOrder } from "@/types";
import { Card, CardContent } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@curo/web/ui/tabs";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { User, FlaskConical, FileText } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [results, setResults] = useState<LabResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPatientById(patientId), getLabOrdersByPatient(patientId), getLabResultsByPatient(patientId)])
      .then(([pt, ords, res]) => { setPatient(pt); setOrders(ords); setResults(res); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [patientId]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!patient) return <div className="p-8 text-center text-slate-500">Patient not found.</div>;

  const age = calculateAge(patient.dob);

  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Patient Header */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-slate-900">{patient.name.full}</h1>
                <Badge variant="outline" className="text-slate-600">{patient.mrn}</Badge>
                {patient.phn && <Badge variant="outline" className="text-slate-600" title="Personal Health Number">PHN {patient.phn}</Badge>}
              </div>
              {/* Lab sees only identity needed for specimen labeling — no blood type,
                  contact, or address (data minimization). */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                <span>{age}y / {patient.sex.charAt(0).toUpperCase()}{patient.sex.slice(1)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-md mb-4">
          <TabsTrigger value="orders" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FlaskConical className="h-4 w-4 mr-2" /> Lab Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4 mr-2" /> Results History ({results.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3">
          {sortedOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No lab orders found for this patient.</div>
          ) : (
            sortedOrders.map(order => (
              <Card key={order.id} className="shadow-sm border-slate-200 hover:bg-slate-50/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-slate-900">{order.id.slice(0, 8).toUpperCase()}</span>
                        <StatusBadge status={order.status} />
                        <Badge variant="outline" className={
                          order.priority === 'stat' ? 'text-red-700 border-red-200 bg-red-50' :
                          order.priority === 'urgent' ? 'text-amber-700 border-amber-200 bg-amber-50' :
                          'text-slate-600 border-slate-200 bg-slate-50'
                        }>
                          {order.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">
                        {order.tests.map(t => t.name).join(', ')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Ordered: {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <Link href={ROUTES.ORDER(order.id)}>
                      <Button variant="outline" size="sm" className="shrink-0">View</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-3">
          {results.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No results available for this patient.</div>
          ) : (
            results.map(result => (
              <Card key={result.id} className="shadow-sm border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-slate-900">Lab Report</span>
                    <span className="text-xs text-slate-400">{formatDate(result.performedAt)}</span>
                  </div>
                  <div className="bg-slate-50 rounded-md p-3 space-y-1.5">
                    {result.results.map((rr, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{rr.testName}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rr.value} {rr.unit}</span>
                          {rr.flag && rr.flag !== 'normal' && (
                            <Badge variant="outline" className={
                              rr.flag === 'critical' ? 'text-red-700 border-red-200 bg-red-50 text-xs' :
                              'text-amber-700 border-amber-200 bg-amber-50 text-xs'
                            }>{rr.flag.toUpperCase()}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
