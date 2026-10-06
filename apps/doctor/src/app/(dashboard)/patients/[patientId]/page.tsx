"use client";

import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PatientHeader } from "@/components/features/patients/PatientHeader";
import { PatientChartTabs } from "@/components/features/patients/PatientChartTabs";
import { getPatientById, getAllergies, getConditions } from "@/lib/api/patients";
import { getEncountersByPatient } from "@/lib/api/encounters";
import { getLabOrdersByPatient, getLatestVitals, getPrescriptionsByPatient } from "@/lib/api/clinical";
import { findTodaysAppointment, hasDraft, visitDraftKey } from "@/lib/visit";
import type { Allergy, Appointment, Encounter, LabOrder, Patient, Prescription, Problem, Vitals } from "@/types";

interface Chart {
  patient: Patient | null;
  allergies: Allergy[];
  problems: Problem[];
  encounters: Encounter[];
  labOrders: LabOrder[];
  prescriptions: Prescription[];
  latestVitals: { vitals: Partial<Vitals>; recordedAt: string | null };
  todaysAppointment: Appointment | null;
}

export default function PatientChartPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const { user } = useAuth();
  const [chart, setChart] = useState<Chart | null>(null);

  useEffect(() => {
    const none = <T,>(fallback: T) => () => fallback;
    Promise.all([
      getPatientById(patientId),
      getAllergies(patientId).catch(none<Allergy[]>([])),
      getConditions(patientId).catch(none<Problem[]>([])),
      getEncountersByPatient(patientId).catch(none<Encounter[]>([])),
      getLabOrdersByPatient(patientId).catch(none<LabOrder[]>([])),
      getPrescriptionsByPatient(patientId).catch(none<Prescription[]>([])),
      getLatestVitals(patientId).catch(none({ vitals: {}, recordedAt: null })),
      findTodaysAppointment(patientId),
    ]).then(([patient, allergies, problems, encounters, labOrders, prescriptions, latestVitals, todaysAppointment]) =>
      setChart({
        patient, allergies, problems, latestVitals, todaysAppointment,
        encounters: [...encounters].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
        labOrders: [...labOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        prescriptions,
      }));
  }, [patientId]);

  if (!chart) return <PageSkeleton side={false} />;
  if (!chart.patient) notFound();

  const draft = !!user && hasDraft(visitDraftKey(user.id, patientId, chart.todaysAppointment?.id));

  return (
    <div className="space-y-6">
      <PatientHeader patient={chart.patient} allergies={chart.allergies} todaysAppointment={chart.todaysAppointment} hasDraft={draft} />
      <PatientChartTabs
        patient={chart.patient}
        encounters={chart.encounters}
        allergies={chart.allergies}
        problems={chart.problems}
        labOrders={chart.labOrders}
        prescriptions={chart.prescriptions}
        latestVitals={chart.latestVitals}
      />
    </div>
  );
}
