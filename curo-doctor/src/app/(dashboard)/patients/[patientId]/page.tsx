"use client";

import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { calculateAge } from "@/lib/utils";
import { PatientHeader } from "@/components/features/patients/PatientHeader";
import { PatientChartTabs } from "@/components/features/patients/PatientChartTabs";
import { getPatientById, getAllergies, getConditions } from "@/lib/api/patients";
import { getEncountersByPatient } from "@/lib/api/encounters";
import { getLabOrdersByPatient, getPrescriptionsByPatient } from "@/lib/api/clinical";
import { getLabTestCatalog } from "@/lib/data/api";
import type { Patient, Allergy, Problem, Encounter, LabOrder, Prescription, LabTestCatalogItem } from "@/types";

export default function PatientChartPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labTestCatalog, setLabTestCatalog] = useState<LabTestCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);

  useEffect(() => {
    Promise.all([
      getPatientById(patientId),
      getAllergies(patientId),
      getConditions(patientId),
      getEncountersByPatient(patientId),
      getLabOrdersByPatient(patientId),
      getPrescriptionsByPatient(patientId),
      getLabTestCatalog(),
    ])
      .then(([pt, alg, probs, encs, labs, rxs, catalog]) => {
        if (!pt) { setNotFoundError(true); return; }
        setPatient(pt);
        setAllergies(alg);
        setProblems(probs);
        setEncounters(encs);
        setLabOrders(labs);
        setPrescriptions(rxs);
        setLabTestCatalog(catalog);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (notFoundError || !patient) {
    notFound();
  }

  const age = calculateAge(patient!.dob);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PatientHeader patient={patient!} allergies={allergies} age={age} />
      <PatientChartTabs
        patient={patient!}
        encounters={encounters}
        allergies={allergies}
        problems={problems}
        labOrders={labOrders}
        prescriptions={prescriptions}
        labTestCatalog={labTestCatalog}
      />
    </div>
  );
}
