"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Patient, ICD10, Medication, LabTestCatalogItem, 
  Encounter, SOAP, Vitals, Diagnosis, Prescription, LabOrder, PrescriptionItem
} from "@/types";
import { calculateBMI } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, CheckCircle, Search, Plus, Trash2, FileSignature, Activity, Stethoscope, Pill, Beaker } from "lucide-react";
import Link from "next/link";

interface Props {
  patient: Patient;
  appointmentId?: string;
  icd10Catalog: ICD10[];
  medicationsCatalog: Medication[];
  labTestsCatalog: LabTestCatalogItem[];
}

export function EncounterEditor({ patient, appointmentId, icd10Catalog, medicationsCatalog, labTestsCatalog }: Props) {
  const router = useRouter();
  
  // State
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [soap, setSoap] = useState<SOAP>({ subjective: "", objective: "", assessment: "", plan: "" });
  const [vitals, setVitals] = useState<Partial<Vitals>>({});
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [tests, setTests] = useState<{testId: string, name: string, status: 'ordered'}[]>([]);
  const [labPriority, setLabPriority] = useState<'routine' | 'urgent'>('routine');
  const [labNotes, setLabNotes] = useState("");
  const [isSignLoading, setIsSignLoading] = useState(false);

  // Search states
  const [icdQuery, setIcdQuery] = useState("");
  const [medQuery, setMedQuery] = useState("");
  const [labQuery, setLabQuery] = useState("");

  const bmi = vitals.heightCm && vitals.weightKg ? calculateBMI(vitals.heightCm, vitals.weightKg) : null;

  const handleFinishVisit = async () => {
    setIsSignLoading(true);
    // In real app, make API POST request here
    setTimeout(() => {
      // Simulate saving and redirect
      router.push(`/patients/${patient.id}`);
      router.refresh();
    }, 1000);
  };

  const filteredIcd = icd10Catalog.filter(i => {
    if(!icdQuery) return false;
    const q = icdQuery.toLowerCase();
    return i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.keywords.some(k => k.toLowerCase().includes(q));
  }).slice(0, 5);

  const addDiagnosis = (icd: ICD10) => {
    if (!diagnoses.some(d => d.icdCode === icd.code)) {
      setDiagnoses([...diagnoses, { icdCode: icd.code, name: icd.name, isPrimary: diagnoses.length === 0 }]);
    }
    setIcdQuery("");
  };

  const togglePrimary = (code: string) => {
    setDiagnoses(diagnoses.map(d => ({ ...d, isPrimary: d.icdCode === code })));
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href={`/patients/${patient.id}`} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Visit: {patient.name.full}</h1>
            <p className="text-xs text-muted-foreground mrn-badge">MRN: {patient.mrn}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" className="w-full md:w-auto">
            <Save className="h-4 w-4 mr-2" /> Save Draft
          </Button>
          <Button onClick={handleFinishVisit} disabled={isSignLoading} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
            <CheckCircle className="h-4 w-4 mr-2" /> 
            {isSignLoading ? "Signing..." : "Sign & Finish Visit"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column - Main Documentation */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-indigo-600" /> Clinical Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="cc" className="font-semibold text-slate-700">Chief Complaint</Label>
                <Input id="cc" value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} placeholder="e.g. Chest pain for 2 days" className="mt-1" />
              </div>
              
              <Tabs defaultValue="subjective" className="w-full mt-4">
                <TabsList className="w-full grid grid-cols-4 bg-slate-100 p-1 rounded-md">
                  <TabsTrigger value="subjective" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Subjective</TabsTrigger>
                  <TabsTrigger value="objective" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Objective</TabsTrigger>
                  <TabsTrigger value="assessment" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Assessment</TabsTrigger>
                  <TabsTrigger value="plan" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Plan</TabsTrigger>
                </TabsList>
                <div className="mt-4">
                  <TabsContent value="subjective">
                    <Textarea 
                      placeholder="History of Present Illness (HPI), Review of Systems (ROS)..." 
                      className="min-h-[200px] resize-y"
                      value={soap.subjective}
                      onChange={e => setSoap({...soap, subjective: e.target.value})}
                    />
                  </TabsContent>
                  <TabsContent value="objective">
                    <Textarea 
                      placeholder="Physical Exam findings, Visual observations..." 
                      className="min-h-[200px]"
                      value={soap.objective}
                      onChange={e => setSoap({...soap, objective: e.target.value})}
                    />
                  </TabsContent>
                  <TabsContent value="assessment">
                    <Textarea 
                      placeholder="Clinical impressions, differential diagnoses..." 
                      className="min-h-[200px]"
                      value={soap.assessment}
                      onChange={e => setSoap({...soap, assessment: e.target.value})}
                    />
                  </TabsContent>
                  <TabsContent value="plan">
                    <Textarea 
                      placeholder="Treatment instructions, referrals, follow-up..." 
                      className="min-h-[200px]"
                      value={soap.plan}
                      onChange={e => setSoap({...soap, plan: e.target.value})}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-blue-600" /> Diagnoses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="relative">
                <Label htmlFor="icd-search" className="sr-only">Search ICD-10</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    id="icd-search" 
                    value={icdQuery} 
                    onChange={e => setIcdQuery(e.target.value)} 
                    placeholder="Search diagnoses by keyword or ICD-10 code..." 
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                {/* Search Results Dropdown */}
                {icdQuery && (
                  <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                    {filteredIcd.length > 0 ? filteredIcd.map(icd => (
                      <button 
                        key={icd.code} 
                        type="button" 
                        onClick={() => addDiagnosis(icd)}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b last:border-0 flex justify-between items-center"
                      >
                        <span className="font-medium">{icd.name}</span>
                        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{icd.code}</span>
                      </button>
                    )) : (
                      <div className="px-4 py-3 text-sm text-slate-500">No matching diagnoses found.</div>
                    )}
                  </div>
                )}
              </div>

              {diagnoses.length > 0 && (
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="px-4 py-2 font-medium">ICD-10</th>
                        <th className="px-4 py-2 font-medium">Description</th>
                        <th className="px-4 py-2 font-medium">Primary</th>
                        <th className="px-4 py-2 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {diagnoses.map(d => (
                        <tr key={d.icdCode} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono text-slate-700">{d.icdCode}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                          <td className="px-4 py-3">
                            <input 
                              type="radio" 
                              name="primary-diagnosis" 
                              checked={d.isPrimary} 
                              onChange={() => togglePrimary(d.icdCode)}
                              className="h-4 w-4 text-blue-600 cursor-pointer" 
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => setDiagnoses(diagnoses.filter(x => x.icdCode !== d.icdCode))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* e-Prescription */}
          <Card className="shadow-sm border-slate-200">
             <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-600" /> e-Prescription
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="relative">
                <Label htmlFor="med-search" className="sr-only">Search Medications</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    id="med-search" 
                    value={medQuery} 
                    onChange={e => setMedQuery(e.target.value)} 
                    placeholder="Search medications by name or generic..." 
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                {medQuery && (
                  <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                    {medicationsCatalog.filter(m => m.name.toLowerCase().includes(medQuery.toLowerCase()) || m.genericName.toLowerCase().includes(medQuery.toLowerCase())).slice(0, 5).map(med => (
                      <button 
                        key={med.id} 
                        type="button" 
                        onClick={() => {
                          setPrescriptions([...prescriptions, { 
                            id: `rx-${Date.now()}`, medicationId: med.id, displayName: med.name, 
                            dose: "", route: "oral", frequency: "", durationDays: 1, quantity: 1, instructions: "", substitutes: []
                          }]);
                          setMedQuery("");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b last:border-0"
                      >
                        <div className="font-medium">{med.name}</div>
                        <div className="text-xs text-slate-500">{med.genericName} • {med.strength}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {prescriptions.length > 0 && (
                <div className="space-y-4">
                  {prescriptions.map((rx, idx) => (
                    <div key={rx.id} className="p-4 border border-slate-200 rounded-md bg-slate-50/50">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                        <span className="font-semibold text-slate-900">{rx.displayName}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => setPrescriptions(prescriptions.filter(p => p.id !== rx.id))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div className="space-y-1">
                          <Label className="text-xs">Dose</Label>
                          <Input className="h-8" value={rx.dose} onChange={e => { const p = [...prescriptions]; p[idx].dose = e.target.value; setPrescriptions(p); }} placeholder="e.g. 500mg" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Frequency</Label>
                          <Input className="h-8" value={rx.frequency} onChange={e => { const p = [...prescriptions]; p[idx].frequency = e.target.value; setPrescriptions(p); }} placeholder="e.g. BID" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Duration (Days)</Label>
                          <Input type="number" className="h-8" value={rx.durationDays} onChange={e => { const p = [...prescriptions]; p[idx].durationDays = Number(e.target.value); setPrescriptions(p); }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input type="number" className="h-8" value={rx.quantity} onChange={e => { const p = [...prescriptions]; p[idx].quantity = Number(e.target.value); setPrescriptions(p); }} />
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <Label className="text-xs">Instructions (Sig)</Label>
                        <Input className="h-8" value={rx.instructions} onChange={e => { const p = [...prescriptions]; p[idx].instructions = e.target.value; setPrescriptions(p); }} placeholder="e.g. Take 1 tablet by mouth twice daily after meals" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lab Orders */}
           <Card className="shadow-sm border-slate-200">
             <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Beaker className="h-5 w-5 text-purple-600" /> Lab Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input 
                    value={labQuery} 
                    onChange={e => setLabQuery(e.target.value)} 
                    placeholder="Search lab tests..." 
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>
                {labQuery && (
                  <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                    {labTestsCatalog.filter(t => t.name.toLowerCase().includes(labQuery.toLowerCase()) || t.code.toLowerCase().includes(labQuery.toLowerCase())).map(test => (
                      <button 
                        key={test.id} 
                        type="button" 
                        onClick={() => {
                          if (!tests.some(t => t.testId === test.code)) {
                            setTests([...tests, { testId: test.code, name: test.name, status: 'ordered' }]);
                          }
                          setLabQuery("");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm border-b last:border-0"
                      >
                        <span className="font-medium">{test.name}</span> <span className="text-xs text-slate-500">({test.code})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {tests.length > 0 && (
                <div className="space-y-4 border border-slate-200 rounded-md p-4 bg-slate-50/50">
                  <div className="flex flex-wrap gap-2">
                    {tests.map(test => (
                      <Badge key={test.testId} variant="secondary" className="bg-white border-slate-200 px-3 py-1 flex items-center gap-2">
                        {test.name} ({test.testId})
                        <button type="button" onClick={() => setTests(tests.filter(t => t.testId !== test.testId))} className="text-slate-400 hover:text-red-500">
                          &times;
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Priority</Label>
                      <select 
                        className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                        value={labPriority}
                        onChange={(e) => setLabPriority(e.target.value as any)}
                      >
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">STAT</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Clinical Notes for Lab</Label>
                      <Input className="h-9" value={labNotes} onChange={e => setLabNotes(e.target.value)} placeholder="e.g. Fasting sample" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Vitals & Context */}
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-500" /> Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">BP Systolic</Label>
                  <Input type="number" placeholder="mmHg" className="h-8 text-sm" value={vitals.bpSystolic || ''} onChange={e => setVitals({...vitals, bpSystolic: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">BP Diastolic</Label>
                  <Input type="number" placeholder="mmHg" className="h-8 text-sm" value={vitals.bpDiastolic || ''} onChange={e => setVitals({...vitals, bpDiastolic: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Pulse</Label>
                  <Input type="number" placeholder="bpm" className="h-8 text-sm" value={vitals.pulseBpm || ''} onChange={e => setVitals({...vitals, pulseBpm: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Temp (°C)</Label>
                  <Input type="number" placeholder="°C" className="h-8 text-sm" value={vitals.temperatureC || ''} onChange={e => setVitals({...vitals, temperatureC: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">SpO2 (%)</Label>
                  <Input type="number" placeholder="%" className="h-8 text-sm" value={vitals.spo2Percent || ''} onChange={e => setVitals({...vitals, spo2Percent: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Resp (rpm)</Label>
                  <Input type="number" placeholder="rpm" className="h-8 text-sm" value={vitals.respirationRpm || ''} onChange={e => setVitals({...vitals, respirationRpm: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Height (cm)</Label>
                  <Input type="number" placeholder="cm" className="h-8 text-sm" value={vitals.heightCm || ''} onChange={e => setVitals({...vitals, heightCm: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Weight (kg)</Label>
                  <Input type="number" placeholder="kg" className="h-8 text-sm" value={vitals.weightKg || ''} onChange={e => setVitals({...vitals, weightKg: Number(e.target.value)})} />
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Calculated BMI</span>
                <Badge variant={bmi && bmi > 25 ? 'destructive' : 'secondary'} className="text-sm py-1">
                  {bmi ? bmi : '--'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
