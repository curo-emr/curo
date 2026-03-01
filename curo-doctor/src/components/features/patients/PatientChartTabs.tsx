"use client";

import { Patient, Encounter, Allergy, Problem, LabOrder } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight, FileText, Beaker, Pill, AlertTriangle, Activity, Calendar } from "lucide-react";

interface Props {
  patient: Patient;
  encounters: Encounter[];
  allergies: Allergy[];
  problems: Problem[];
  labOrders: LabOrder[];
}

export function PatientChartTabs({ patient, encounters, allergies, problems, labOrders }: Props) {
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'in_progress': return <Badge variant="default" className="bg-blue-100 text-blue-700">In Progress</Badge>;
      case 'completed': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Completed</Badge>;
      case 'scheduled': return <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50">Scheduled</Badge>;
      default: return <Badge variant="outline">{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="bg-white border-b border-slate-200 px-2 py-0 h-auto w-full justify-start rounded-none space-x-6 overflow-x-auto scollbar-none">
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
                    // In a real app we'd map these to names via medication list
                    <div className="p-4 text-sm flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">{patient.currentMedications.length} Active Meds</Badge>
                      <span className="text-xs text-slate-500 block mt-1 w-full">See Medications tab for details.</span>
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
                <Link href="#" onClick={(e) => { e.preventDefault(); document.querySelector('[value="encounters"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })); }} className="text-sm text-blue-600 hover:underline">
                  View All
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {encounters.slice(0, 3).map(e => (
                    <Link key={e.id} href={`/patients/${patient.id}/encounters/${e.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900 group-hover:text-blue-600">{formatDate(e.startedAt)}</span>
                          {getStatusBadge(e.status)}
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
                      {getStatusBadge(e.status)}
                    </div>
                    <p className="text-slate-600 mb-2">{e.chiefComplaint}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {e.diagnoses.map(d => (
                        <Badge key={d.icdCode} variant="secondary" className="bg-slate-100 text-slate-600 text-xs">
                          {d.icdCode} - {d.name}
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
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <h4 className="font-semibold text-slate-900">{a.substance}</h4>
                            <Badge variant="outline" className={`
                              ${a.severity === 'severe' ? 'text-red-700 border-red-200 bg-red-50' : 
                                a.severity === 'moderate' ? 'text-orange-700 border-orange-200 bg-orange-50' : 
                                'text-blue-700 border-blue-200 bg-blue-50'}
                            `}>
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

        {/* Placeholder tabs for Meds and Labs */}
        <TabsContent value="medications" className="outline-none py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
          <Pill className="h-8 w-8 mx-auto mb-3 text-slate-300" />
          Medications detailed view coming soon.
        </TabsContent>

        <TabsContent value="labs" className="outline-none py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
          <Beaker className="h-8 w-8 mx-auto mb-3 text-slate-300" />
          {labOrders.length} lab orders found. Detailed view coming soon.
        </TabsContent>

      </div>
    </Tabs>
  );
}
