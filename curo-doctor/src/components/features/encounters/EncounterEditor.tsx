"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Patient, ICD10, Medication, LabTestCatalogItem,
  SOAP, Vitals, Diagnosis, PrescriptionItem
} from "@/types";
import { calculateBMI, getBMICategory } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, CheckCircle, Search, Plus, Trash2, FileSignature, Activity, Stethoscope, Pill, Beaker } from "lucide-react";
import Link from "next/link";

interface Props {
  patient: Patient;
  appointmentId?: string;
  icd10Catalog: ICD10[];
  medicationsCatalog: Medication[];
  labTestsCatalog: LabTestCatalogItem[];
}

export function EncounterEditor({ patient, icd10Catalog }: Props) {
  const router = useRouter();

  // State
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [soap, setSoap] = useState<SOAP>({ subjective: "", objective: "", assessment: "", plan: "" });
  const [vitals, setVitals] = useState<Partial<Vitals>>({});
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [tests, setTests] = useState<{ testId: string; name: string; status: 'ordered' }[]>([]);
  const [labPriority, setLabPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [labNotes, setLabNotes] = useState("");
  const [showResultsToPatient, setShowResultsToPatient] = useState(false);
  const [isSignLoading, setIsSignLoading] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  // Search state
  const [icdQuery, setIcdQuery] = useState("");
  const [newMed, setNewMed] = useState({ name: "", dose: "", frequency: "", durationDays: 1, quantity: 1, instructions: "" });
  const [newTest, setNewTest] = useState({ name: "", notes: "" });

  const addMedication = () => {
    if (!newMed.name.trim()) return;
    setPrescriptions(prev => [
      ...prev,
      {
        id: `rx-${Date.now()}`,
        medicationId: `custom-${Date.now()}`,
        displayName: newMed.name,
        dose: newMed.dose,
        route: "oral",
        frequency: newMed.frequency,
        durationDays: newMed.durationDays,
        quantity: newMed.quantity,
        instructions: newMed.instructions,
        substitutes: [],
      }
    ]);
    setNewMed({ name: "", dose: "", frequency: "", durationDays: 1, quantity: 1, instructions: "" });
  };

  const updatePrescriptionField = <K extends keyof PrescriptionItem>(
    id: string,
    field: K,
    value: PrescriptionItem[K]
  ) => {
    setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addLabTest = () => {
    if (!newTest.name.trim()) return;
    const label = newTest.name + (newTest.notes ? ` — ${newTest.notes}` : "");
    setTests(prev => [...prev, { testId: `custom-${Date.now()}`, name: label, status: 'ordered' }]);
    setNewTest({ name: "", notes: "" });
  };

  const bmi = vitals.heightCm && vitals.weightKg ? calculateBMI(vitals.heightCm, vitals.weightKg) : null;
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  const bmiVariant = () => {
    if (!bmiCategory) return 'secondary';
    if (bmiCategory === 'obese') return 'destructive';
    if (bmiCategory === 'overweight') return 'outline';
    return 'outline';
  };

  const bmiClass = () => {
    if (!bmiCategory) return '';
    if (bmiCategory === 'obese') return '';
    if (bmiCategory === 'overweight') return 'text-amber-700 border-amber-300 bg-amber-50';
    return 'text-green-700 border-green-300 bg-green-50';
  };

  const handleSaveDraft = () => {
    setIsDraftSaved(true);
    setTimeout(() => setIsDraftSaved(false), 2000);
  };

  const handleFinishVisit = async () => {
    setIsSignLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      router.push(`/patients/${patient.id}`);
      router.refresh();
    } catch {
      setIsSignLoading(false);
    }
  };

  const filteredIcd = icdQuery
    ? icd10Catalog.filter(i => {
        const q = icdQuery.toLowerCase();
        return i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.keywords.some(k => k.toLowerCase().includes(q));
      }).slice(0, 6)
    : [];

  const addDiagnosis = (icd: ICD10) => {
    if (!diagnoses.some(d => d.icdCode === icd.code)) {
      setDiagnoses(prev => [...prev, { icdCode: icd.code, name: icd.name, isPrimary: prev.length === 0 }]);
    }
    setIcdQuery("");
  };

  const togglePrimary = (code: string) => {
    setDiagnoses(prev => prev.map(d => ({ ...d, isPrimary: d.icdCode === code })));
  };

  const SOAP_SECTIONS = [
    { key: 'subjective' as const, label: 'S — Subjective', placeholder: 'History of Present Illness (HPI), chief complaint, review of systems, symptoms reported by patient...' },
    { key: 'objective' as const, label: 'O — Objective', placeholder: 'Physical exam findings, vital sign observations, relevant test results observed...' },
    { key: 'assessment' as const, label: 'A — Assessment', placeholder: 'Clinical impressions, working diagnosis, differential diagnoses...' },
    { key: 'plan' as const, label: 'P — Plan', placeholder: 'Treatment plan, medications ordered, lab orders, referrals, patient instructions, follow-up...' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Sticky Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href={`/patients/${patient.id}`} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New Visit: {patient.name.full}</h1>
            <p className="text-xs text-muted-foreground">MRN: {patient.mrn}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={handleSaveDraft}
            disabled={isDraftSaved}
          >
            {isDraftSaved ? (
              <><CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Saved</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save Draft</>
            )}
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

          {/* Chief Complaint + SOAP */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-indigo-600" /> Clinical Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div>
                <Label htmlFor="cc" className="font-semibold text-slate-700">Chief Complaint</Label>
                <Input id="cc" value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} placeholder="e.g. Chest pain for 2 days" className="mt-1" />
              </div>

              {/* SOAP — stacked sections, all visible at once */}
              <div className="space-y-5 mt-2 pt-2 border-t border-slate-100">
                {SOAP_SECTIONS.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <Label className="font-semibold text-slate-700 text-sm tracking-wide">{label}</Label>
                    <Textarea
                      placeholder={placeholder}
                      className="mt-1.5 min-h-[120px] resize-y text-sm"
                      value={soap[key]}
                      onChange={e => setSoap(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Diagnoses */}
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
                {/* Dropdown */}
                {icdQuery && (
                  <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                    {filteredIcd.length > 0 ? filteredIcd.map(icd => (
                      <button
                        key={icd.code}
                        type="button"
                        onClick={() => addDiagnosis(icd)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm border-b last:border-0 flex justify-between items-center gap-4"
                      >
                        <span className="font-medium">{icd.name}</span>
                        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{icd.code}</span>
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
                        <th className="px-4 py-2 font-medium text-right">Remove</th>
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
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => setDiagnoses(prev => prev.filter(x => x.icdCode !== d.icdCode))}
                            >
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
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                <div className="flex flex-col md:flex-row items-end gap-3 flex-wrap">
                  <div className="space-y-1 flex-1 w-full min-w-[200px]">
                    <Label className="text-xs text-slate-600">Medicine Name</Label>
                    <Input value={newMed.name} onChange={e => setNewMed(m => ({ ...m, name: e.target.value }))} placeholder="e.g. Amoxicillin 500mg" className="h-9 bg-white" />
                  </div>
                  <div className="space-y-1 w-full md:w-24">
                    <Label className="text-xs text-slate-600">Dose</Label>
                    <Input value={newMed.dose} onChange={e => setNewMed(m => ({ ...m, dose: e.target.value }))} placeholder="500mg" className="h-9 bg-white" />
                  </div>
                  <div className="space-y-1 w-full md:w-28">
                    <Label className="text-xs text-slate-600">Frequency</Label>
                    <Input value={newMed.frequency} onChange={e => setNewMed(m => ({ ...m, frequency: e.target.value }))} placeholder="TID" className="h-9 bg-white" />
                  </div>
                  <div className="space-y-1 w-full md:w-20">
                    <Label className="text-xs text-slate-600">Days</Label>
                    <Input type="number" value={newMed.durationDays} onChange={e => setNewMed(m => ({ ...m, durationDays: parseInt(e.target.value) || 1 }))} className="h-9 bg-white" />
                  </div>
                  <div className="space-y-1 flex-1 w-full min-w-[150px]">
                    <Label className="text-xs text-slate-600">Instructions</Label>
                    <Input value={newMed.instructions} onChange={e => setNewMed(m => ({ ...m, instructions: e.target.value }))} placeholder="e.g. After meals" className="h-9 bg-white" />
                  </div>
                  <Button type="button" onClick={addMedication} className="h-9 bg-emerald-600 hover:bg-emerald-700 shrink-0 gap-1.5">
                    <Plus className="h-4 w-4" /> Add Medication
                  </Button>
                </div>
              </div>

              {prescriptions.length > 0 && (
                <div className="space-y-4">
                  {prescriptions.map(rx => (
                    <div key={rx.id} className="p-4 border border-slate-200 rounded-md bg-slate-50/50">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                        <span className="font-semibold text-slate-900">{rx.displayName}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-red-500"
                          onClick={() => setPrescriptions(prev => prev.filter(p => p.id !== rx.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        {(['dose', 'frequency'] as const).map(field => (
                          <div key={field} className="space-y-1">
                            <Label className="text-xs capitalize">{field}</Label>
                            <Input className="h-8" value={rx[field] as string} onChange={e => updatePrescriptionField(rx.id, field, e.target.value)} placeholder={field === 'dose' ? 'e.g. 500mg' : 'e.g. BID'} />
                          </div>
                        ))}
                        <div className="space-y-1">
                          <Label className="text-xs">Duration (Days)</Label>
                          <Input type="number" className="h-8" value={rx.durationDays} onChange={e => updatePrescriptionField(rx.id, 'durationDays', Number(e.target.value))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Quantity</Label>
                          <Input type="number" className="h-8" value={rx.quantity} onChange={e => updatePrescriptionField(rx.id, 'quantity', Number(e.target.value))} />
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <Label className="text-xs">Instructions (Sig)</Label>
                        <Input className="h-8" value={rx.instructions} onChange={e => updatePrescriptionField(rx.id, 'instructions', e.target.value)} placeholder="e.g. Take 1 tablet by mouth twice daily after meals" />
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
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                <div className="flex flex-col md:flex-row items-end gap-3">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-slate-600">Test Name</Label>
                    <Input value={newTest.name} onChange={e => setNewTest(t => ({ ...t, name: e.target.value }))} placeholder="e.g. Complete Blood Count (CBC)" className="h-9 bg-white" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs text-slate-600">Specific Instructions</Label>
                    <Input value={newTest.notes} onChange={e => setNewTest(t => ({ ...t, notes: e.target.value }))} placeholder="e.g. Fasting required" className="h-9 bg-white" />
                  </div>
                  <Button type="button" onClick={addLabTest} className="h-9 bg-purple-600 hover:bg-purple-700 shrink-0 gap-1.5">
                    <Plus className="h-4 w-4" /> Add Test
                  </Button>
                </div>
              </div>

              {tests.length > 0 && (
                <div className="space-y-4 border border-slate-200 rounded-md p-4 bg-slate-50/50">
                  <div className="flex flex-wrap gap-2">
                    {tests.map(test => (
                      <Badge key={test.testId} variant="secondary" className="bg-white border-slate-200 px-3 py-1 flex items-center gap-2">
                        {test.name}
                        <button type="button" onClick={() => setTests(prev => prev.filter(t => t.testId !== test.testId))} className="text-slate-400 hover:text-red-500 ml-1">
                          &times;
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Priority</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                        value={labPriority}
                        onChange={e => setLabPriority(e.target.value as 'routine' | 'urgent' | 'stat')}
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
                    <div className="md:col-span-2 flex items-center space-x-2 pt-1">
                      <Checkbox
                        id="showResults"
                        checked={showResultsToPatient}
                        onCheckedChange={checked => setShowResultsToPatient(checked === true)}
                      />
                      <label htmlFor="showResults" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                        Show results to patient
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Vitals */}
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-500" /> Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'bpSystolic' as const, label: 'BP Systolic', unit: 'mmHg' },
                  { key: 'bpDiastolic' as const, label: 'BP Diastolic', unit: 'mmHg' },
                  { key: 'pulseBpm' as const, label: 'Pulse', unit: 'bpm' },
                  { key: 'temperatureC' as const, label: 'Temp (°C)', unit: '°C' },
                  { key: 'spo2Percent' as const, label: 'SpO2 (%)', unit: '%' },
                  { key: 'respirationRpm' as const, label: 'Resp (rpm)', unit: 'rpm' },
                  { key: 'heightCm' as const, label: 'Height (cm)', unit: 'cm' },
                  { key: 'weightKg' as const, label: 'Weight (kg)', unit: 'kg' },
                ].map(({ key, label, unit }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-slate-500">{label}</Label>
                    <Input
                      type="number"
                      placeholder={unit}
                      className="h-8 text-sm"
                      value={vitals[key] || ''}
                      onChange={e => setVitals(v => ({ ...v, [key]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Calculated BMI</span>
                {bmi ? (
                  <Badge variant={bmiVariant()} className={`text-sm py-1 ${bmiClass()}`}>
                    {bmi} <span className="ml-1 text-xs capitalize opacity-80">({bmiCategory})</span>
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-sm py-1 text-slate-400">--</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
