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
      await new Promise(r => setTimeout(r, 800));
      toast.success("Visit signed and completed");
      router.push(ROUTES.PATIENT(patient.id));
      router.refresh();
    } catch {
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
