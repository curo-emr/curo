"use client";

import { useState } from "react";
import { Patient, Encounter, Allergy, Problem, LabOrder, Prescription, LabTestCatalogItem } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatStatus } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import { ChevronRight, Beaker, Pill, AlertTriangle, Activity, Calendar } from "lucide-react";

interface Props {
  patient: Patient;
  encounters: Encounter[];
  allergies: Allergy[];
  problems: Problem[];
  labOrders: LabOrder[];
  prescriptions: Prescription[];
  labTestCatalog: LabTestCatalogItem[];
  initialTab?: string;
}

export function PatientChartTabs({
  patient,
  encounters,
  allergies,
  problems,
  labOrders,
  prescriptions,
  labTestCatalog,
  initialTab = "overview",
}: Props) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const getTestName = (testId: string): string => {
    const test = labTestCatalog.find(t => t.id === testId);
    return test ? `${test.name} (${test.code})` : testId;
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="bg-white border-b border-slate-200 px-2 py-0 h-auto w-full justify-start rounded-none space-x-6 overflow-x-auto scrollbar-none">
        <TabsTrigger value="overview" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-slate-600 data-[state=active]:text-blue-700">Overview</TabsTrigger>
        <TabsTrigger value="encounters" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-slate-600 data-[state=active]:text-blue-700">Encounters ({encounters.length})</TabsTrigger>
        <TabsTrigger value="problems" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-slate-600 data-[state=active]:text-blue-700">Problems ({problems.length})</TabsTrigger>
        <TabsTrigger value="allergies" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-slate-600 data-[state=active]:text-blue-700">Allergies ({allergies.length})</TabsTrigger>
        <TabsTrigger value="medications" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-slate-600 data-[state=active]:text-blue-700">Medications</TabsTrigger>
        <TabsTrigger value="labs" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-1 text-slate-600 data-[state=active]:text-blue-700">Labs & Reports ({labOrders.length})</TabsTrigger>
      </TabsList>

      <div className="mt-6">
        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" /> Active Problems
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {problems.filter(p => p.status === 'active').length === 0 ? (
                    <div className="p-4 text-sm text-slate-500 text-center">No active problems.</div>
                  ) : (
                    problems.filter(p => p.status === 'active').map(p => (
                      <div key={p.id} className="p-4 text-sm hover:bg-slate-50">
                        <div className="font-medium text-slate-900">{p.name}</div>
                        <div className="text-slate-500 text-xs mt-1">ICD: {p.icdCode} • Onset: {formatDate(p.onsetDate)}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="h-4 w-4 text-emerald-500" /> Current Medications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {patient.currentMedications.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500 text-center">No current medications on file.</div>
                  ) : (
                    <div className="p-4 text-sm flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">{patient.currentMedications.length} Active Meds</Badge>
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 px-2" onClick={() => setActiveTab("medications")}>
                        View Medications →
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 md:col-span-2">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-500" /> Recent Encounters
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 px-2" onClick={() => setActiveTab("encounters")}>
                  View All →
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {encounters.slice(0, 3).map(e => (
                    <Link key={e.id} href={`/patients/${patient.id}/encounters/${e.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900 group-hover:text-blue-600">{formatDate(e.startedAt)}</span>
                          <StatusBadge status={e.status} />
                        </div>
                        <p className="text-sm text-slate-600">{e.chiefComplaint}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500" />
                    </Link>
                  ))}
                  {encounters.length === 0 && (
                    <div className="p-4 text-sm text-slate-500 text-center">No past encounters.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ENCOUNTERS TAB */}
        <TabsContent value="encounters" className="space-y-4 outline-none">
          {encounters.map(e => (
            <Link key={e.id} href={`/patients/${patient.id}/encounters/${e.id}`} className="block">
              <Card className="shadow-sm border-slate-200 hover:border-blue-300 transition-colors group">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-slate-900 group-hover:text-blue-600">{formatDate(e.startedAt)}</h3>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="text-slate-600 mb-2">{e.chiefComplaint}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {e.diagnoses.map(d => (
                        <Badge key={d.icdCode} variant="secondary" className="bg-slate-100 text-slate-600 text-xs">
                          {d.icdCode} — {d.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500" />
                </CardContent>
              </Card>
            </Link>
          ))}
          {encounters.length === 0 && (
            <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
              No encounters found for this patient.
            </div>
          )}
        </TabsContent>

        {/* PROBLEMS TAB */}
        <TabsContent value="problems" className="outline-none">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {problems.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No problems recorded.</div>
                ) : (
                  problems.map(p => (
                    <div key={p.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900">{p.name}</h4>
                            <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className={p.status === 'active' ? 'bg-blue-100 text-blue-700' : ''}>
                              {p.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 mb-2">ICD-10: <span className="font-mono text-slate-700">{p.icdCode}</span> • Onset: {formatDate(p.onsetDate)}</p>
                          {p.notes && <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">{p.notes}</p>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALLERGIES TAB */}
        <TabsContent value="allergies" className="outline-none">
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {allergies.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No allergies recorded.</div>
                ) : (
                  allergies.map(a => (
                    <div key={a.id} className="p-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900">{a.substance}</h4>
                            <Badge variant="outline" className={
                              a.severity === 'severe' ? 'text-red-700 border-red-200 bg-red-50' :
                              a.severity === 'moderate' ? 'text-orange-700 border-orange-200 bg-orange-50' :
                              'text-blue-700 border-blue-200 bg-blue-50'
                            }>
                              {a.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">Reaction: <span className="font-medium">{a.reaction}</span> • Recorded: {formatDate(a.recordedAt)}</p>
                          {a.notes && <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">{a.notes}</p>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MEDICATIONS TAB */}
        <TabsContent value="medications" className="outline-none">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-600" /> Prescriptions History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {prescriptions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No prescriptions on record.</div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-slate-600 hidden md:table-header-group">
                      <tr>
                        <th className="px-6 py-3 font-medium">Date</th>
                        <th className="px-6 py-3 font-medium">Medication</th>
                        <th className="px-6 py-3 font-medium">Directions</th>
                        <th className="px-6 py-3 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 block md:table-row-group">
                      {prescriptions.flatMap(rx =>
                        rx.items.map(item => (
                          <tr key={`${rx.id}-${item.id}`} className="hover:bg-slate-50 block md:table-row w-full p-4 md:p-0 border-b md:border-b-0 last:border-0">
                            <td className="md:px-6 md:py-4 align-top block md:table-cell mb-2 md:mb-0">
                              <span className="md:hidden font-semibold mr-2">Date:</span>
                              {formatDate(rx.createdAt)}
                            </td>
                            <td className="md:px-6 md:py-4 align-top block md:table-cell mb-2 md:mb-0 font-medium text-slate-900">
                              <span className="md:hidden font-semibold mr-2 text-slate-500 font-normal">Med:</span>
                              {item.displayName}
                            </td>
                            <td className="md:px-6 md:py-4 align-top block md:table-cell mb-2 md:mb-0 text-slate-600">
                              <span className="md:hidden font-semibold mr-2 text-slate-500">Sig:</span>
                              {item.dose} {item.route} {item.frequency} for {item.durationDays} days. Qty: {item.quantity}. {item.instructions}
                            </td>
                            <td className="md:px-6 md:py-4 align-top block md:table-cell text-left md:text-right">
                              <span className="md:hidden font-semibold mr-2 text-slate-500">Status:</span>
                              <Badge variant="outline" className={rx.status === 'sent_to_pharmacy' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}>
                                {formatStatus(rx.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LABS TAB */}
        <TabsContent value="labs" className="outline-none">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Beaker className="h-5 w-5 text-purple-600" /> Lab Orders & Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {labOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No lab orders on record.</div>
                ) : (
                  labOrders.map(lo => (
                    <div key={lo.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold text-slate-900">Order {formatDate(lo.createdAt)}</span>
                            {lo.priority === 'urgent' && <Badge className="bg-red-50 text-red-700 border-red-200">Urgent</Badge>}
                            <Badge variant="outline" className={
                              lo.status === 'results_pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              lo.status === 'sent_to_lab' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-slate-100 text-slate-700'
                            }>
                              {formatStatus(lo.status)}
                            </Badge>
                          </div>
                          {lo.notesToLab && (
                            <p className="text-sm text-slate-600 bg-white p-2 border border-slate-100 rounded inline-block mb-3">
                              <span className="font-medium">Notes:</span> {lo.notesToLab}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {lo.tests.map(t => (
                              <Badge key={t.testId} variant="secondary" className="bg-white border-slate-200 text-slate-700">
                                {getTestName(t.testId)} — {t.status.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {lo.status === 'results_pending' && !lo.review.isReviewed && (
                            <button className="text-sm px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-md border border-indigo-200 transition-colors">
                              Review Results
                            </button>
                          )}
                          {lo.review.isReviewed && (
                            <span className="text-sm text-green-700 flex items-center gap-1 bg-green-50 px-2 py-1 rounded border border-green-200">
                              <Activity className="h-3 w-3" /> Reviewed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </div>
    </Tabs>
  );
}
