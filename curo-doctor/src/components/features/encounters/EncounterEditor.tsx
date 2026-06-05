"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Patient, ICD10, Medication, LabTestCatalogItem,
  SOAP, Vitals, Diagnosis, PrescriptionItem
} from "@/types";
import { ROUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { ClinicalNotes } from "./sections/ClinicalNotes";
import { DiagnosisSearch } from "./sections/DiagnosisSearch";
import { PrescriptionForm } from "./sections/PrescriptionForm";
import { LabOrderForm } from "./sections/LabOrderForm";
import { VitalsPanel } from "./sections/VitalsPanel";
import { createEncounter, updateEncounterStatus } from "@/lib/api/encounters";
import { createNote, createVitals, createPrescription, createLabOrder } from "@/lib/api/clinical";

interface Props {
  patient: Patient;
  appointmentId?: string;
  icd10Catalog: ICD10[];
  medicationsCatalog: Medication[];
  labTestsCatalog: LabTestCatalogItem[];
}

const VITALS_MAP = [
  { key: 'bpSystolic' as keyof Vitals, code: '8480-6', display: 'Blood Pressure Systolic', unit: 'mmHg' },
  { key: 'bpDiastolic' as keyof Vitals, code: '8462-4', display: 'Blood Pressure Diastolic', unit: 'mmHg' },
  { key: 'pulseBpm' as keyof Vitals, code: '8867-4', display: 'Heart rate', unit: 'bpm' },
  { key: 'temperatureC' as keyof Vitals, code: '8310-5', display: 'Body temperature', unit: 'Cel' },
  { key: 'spo2Percent' as keyof Vitals, code: '2708-6', display: 'Oxygen saturation', unit: '%' },
  { key: 'respirationRpm' as keyof Vitals, code: '9279-1', display: 'Respiratory rate', unit: '/min' },
  { key: 'heightCm' as keyof Vitals, code: '8302-2', display: 'Body height', unit: 'cm' },
  { key: 'weightKg' as keyof Vitals, code: '29463-7', display: 'Body weight', unit: 'kg' },
];

export function EncounterEditor({ patient, appointmentId, icd10Catalog }: Props) {
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

  const handleSaveDraft = () => {
    toast.success("Draft saved");
  };

  const handleFinishVisit = async () => {
    if (!chiefComplaint.trim()) {
      toast.error("Chief complaint is required");
      return;
    }

    setIsSignLoading(true);
    try {
      // 1. Create the encounter
      const encounter = await createEncounter({
        patientId: patient.id,
        appointmentId,
        reasonCode: chiefComplaint,
        periodStart: new Date().toISOString(),
      });
      const encounterId = encounter.id;

      // 2. Save SOAP note
      await createNote({
        patientId: patient.id,
        encounterId,
        subjective: soap.subjective || undefined,
        objective: soap.objective || undefined,
        assessment: soap.assessment || undefined,
        plan: soap.plan || undefined,
        additionalNotes: chiefComplaint,
      });

      // 3. Post vitals (one observation per filled field)
      const vitalPayloads = VITALS_MAP
        .filter(v => vitals[v.key] !== undefined && (vitals[v.key] as number) > 0)
        .map(v => createVitals({
          patientId: patient.id,
          encounterId,
          code: v.code,
          display: v.display,
          valueQuantity: vitals[v.key] as number,
          valueUnit: v.unit,
          effectiveDateTime: new Date().toISOString(),
        }));
      await Promise.all(vitalPayloads);

      // 4. Create prescriptions
      await Promise.all(prescriptions.map(rx => createPrescription({
        patientId: patient.id,
        encounterId,
        medicationCode: rx.medicationId,
        medicationDisplay: rx.displayName,
        dosageText: rx.dose,
        route: rx.route,
        frequency: rx.frequency,
        durationDays: rx.durationDays,
        quantityValue: rx.quantity,
        note: rx.instructions || undefined,
      })));

      // 5. Create lab orders (one per test)
      await Promise.all(tests.map(test => createLabOrder({
        patientId: patient.id,
        encounterId,
        code: test.testId,
        display: test.name,
        priority: labPriority,
        note: labNotes || undefined,
      })));

      // 6. Mark encounter as completed
      await updateEncounterStatus(encounterId, 'completed');

      toast.success("Visit signed and completed");
      router.push(ROUTES.PATIENT(patient.id));
      router.refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to complete visit";
      toast.error(msg);
      setIsSignLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Sticky Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href={ROUTES.PATIENT(patient.id)} className="p-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">New Visit: {patient.name.full}</h1>
            <p className="text-xs text-muted-foreground">MRN: {patient.mrn}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={handleSaveDraft}
          >
            <Save className="h-4 w-4 mr-2" /> Save Draft
          </Button>
          <Button onClick={handleFinishVisit} disabled={isSignLoading} className="w-full md:w-auto bg-primary hover:bg-primary/90">
            <CheckCircle className="h-4 w-4 mr-2" />
            {isSignLoading ? "Signing..." : "Sign & Finish Visit"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Left Column - Main Documentation */}
        <div className="lg:col-span-3 space-y-6">
          <ClinicalNotes
            chiefComplaint={chiefComplaint}
            setChiefComplaint={setChiefComplaint}
            soap={soap}
            setSoap={setSoap}
          />

          <DiagnosisSearch
            icd10Catalog={icd10Catalog}
            diagnoses={diagnoses}
            setDiagnoses={setDiagnoses}
          />

          <PrescriptionForm
            prescriptions={prescriptions}
            setPrescriptions={setPrescriptions}
          />

          <LabOrderForm
            tests={tests}
            setTests={setTests}
            labPriority={labPriority}
            setLabPriority={setLabPriority}
            labNotes={labNotes}
            setLabNotes={setLabNotes}
            showResultsToPatient={showResultsToPatient}
            setShowResultsToPatient={setShowResultsToPatient}
          />
        </div>

        {/* Right Column - Vitals */}
        <div className="space-y-6">
          <VitalsPanel
            vitals={vitals}
            setVitals={setVitals}
          />
        </div>
      </div>
    </div>
  );
}
