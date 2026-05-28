"use client";

import { useState, useEffect, use } from "react";
import { Loader2, ArrowLeft, Stethoscope, Pill, Beaker, FileSignature, Activity } from "lucide-react";
import { calculateBMI, formatDate, formatStatus, getBMICategory } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getEncounterById } from "@/lib/api/encounters";
import { getPatientById } from "@/lib/api/patients";
import { getPrescriptionsByPatient, getLabOrdersByPatient } from "@/lib/api/clinical";
import { getLabTestCatalog } from "@/lib/data/api";
import type { Encounter, Patient, Prescription, LabOrder, LabTestCatalogItem } from "@/types";

export default function EncounterDetailsPage({ params }: { params: Promise<{ patientId: string; encounterId: string }> }) {
  const { patientId, encounterId } = use(params);

  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [labTestCatalog, setLabTestCatalog] = useState<LabTestCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getEncounterById(encounterId),
      getPatientById(patientId),
      getPrescriptionsByPatient(patientId),
      getLabOrdersByPatient(patientId),
      getLabTestCatalog(),
    ])
      .then(([enc, pt, rxs, labs, catalog]) => {
        setEncounter(enc);
        setPatient(pt);
        setPrescriptions(rxs.filter(rx => rx.encounterId === encounterId));
        setLabOrders(labs.filter(l => l.encounterId === encounterId));
        setLabTestCatalog(catalog);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [patientId, encounterId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!encounter || !patient) {
    return <div className="p-8 text-center text-slate-500">Encounter not found.</div>;
  }

  const bmi = encounter.vitals?.heightCm && encounter.vitals?.weightKg
    ? calculateBMI(encounter.vitals.heightCm, encounter.vitals.weightKg)
    : null;
  const bmiCategory = bmi ? getBMICategory(bmi) : null;

  const getTestName = (testId: string) => {
    const t = labTestCatalog.find(t => t.id === testId);
    return t ? `${t.name} (${t.code})` : testId;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/patients/${patientId}`} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5 text-slate-500" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Encounter Details</h1>
            <StatusBadge status={encounter.status} />
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="font-semibold">{patient.name.full}</span> • {formatDate(encounter.startedAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-indigo-600" /> SOAP Note
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {[
                  { label: 'Subjective', value: encounter.soap.subjective, tinted: false },
                  { label: 'Objective', value: encounter.soap.objective, tinted: true },
                  { label: 'Assessment', value: encounter.soap.assessment, tinted: false },
                  { label: 'Plan', value: encounter.soap.plan, tinted: true },
                ].map(({ label, value, tinted }) => (
                  <div key={label} className={`p-5 ${tinted ? 'bg-slate-50/30' : ''}`}>
                    <h4 className="font-semibold text-slate-900 mb-2">{label}</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{value || 'No notes.'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-blue-600" /> Diagnoses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {encounter.diagnoses.map((d, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">{d.name}</span>
                        {d.isPrimary && <Badge className="bg-blue-100 text-blue-700 text-[10px] uppercase">Primary</Badge>}
                      </div>
                      <span className="text-xs text-slate-500 font-mono">ICD-10: {d.icdCode}</span>
                    </div>
                  </div>
                ))}
                {encounter.diagnoses.length === 0 && (
                  <div className="p-4 text-sm text-slate-500 text-center">No diagnoses recorded.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-500" /> Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Blood Pressure', value: `${encounter.vitals?.bpSystolic ?? '—'}/${encounter.vitals?.bpDiastolic ?? '—'} mmHg` },
                  { label: 'Pulse', value: `${encounter.vitals?.pulseBpm ?? '—'} bpm` },
                  { label: 'Temperature', value: `${encounter.vitals?.temperatureC ?? '—'} °C` },
                  { label: 'SpO2', value: `${encounter.vitals?.spo2Percent ?? '—'}%` },
                  { label: 'Weight', value: `${encounter.vitals?.weightKg ?? '—'} kg` },
                  { label: 'Height', value: `${encounter.vitals?.heightCm ?? '—'} cm` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-slate-400 text-xs mb-1">{label}</div>
                    <div className="font-medium">{value}</div>
                  </div>
                ))}
                {bmi && (
                  <div>
                    <div className="text-slate-400 text-xs mb-1">BMI</div>
                    <div className="font-medium">{bmi} <span className="text-xs text-slate-400">({bmiCategory})</span></div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <Pill className="h-5 w-5 text-emerald-500" /> Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {prescriptions.map(rx => (
                  <div key={rx.id} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={rx.status === 'sent_to_pharmacy' ? 'border-green-200 bg-green-50 text-green-700' : ''}>
                        {formatStatus(rx.status)}
                      </Badge>
                    </div>
                    <ul className="space-y-2">
                      {rx.items.map((item, i) => (
                        <li key={i} className="text-sm">
                          <div className="font-medium">{item.displayName}</div>
                          <div className="text-slate-500">{item.dose} • {item.frequency}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {prescriptions.length === 0 && (
                  <div className="p-4 text-sm text-slate-500 text-center">No prescriptions.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <Beaker className="h-5 w-5 text-purple-500" /> Lab Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {labOrders.map(lab => (
                  <div key={lab.id} className="p-4">
                    <Badge variant="outline">{formatStatus(lab.status)}</Badge>
                    <ul className="list-disc pl-5 text-sm mt-2 text-slate-600">
                      {lab.tests.map((t, i) => (
                        <li key={i}>{getTestName(t.testId)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {labOrders.length === 0 && (
                  <div className="p-4 text-sm text-slate-500 text-center">No lab orders.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
