"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { QueryContent, dataOrNull } from "@curo/web/query";
import { PatientHeader } from "@/components/features/patients/PatientHeader";
import { PatientChartTabs } from "@/components/features/patients/PatientChartTabs";
import { BackLink } from "@curo/web/ui/page-header";
import { patientQueries } from "@/lib/queries";
import { ROUTES } from "@/lib/constants";

export default function PatientDetailPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const patient = useQuery(patientQueries.detail(patientId));
  const allergies = dataOrNull(useQuery(patientQueries.allergies(patientId)));

  return (
    <QueryContent query={patient} what="this patient">
      {p => {
        if (!p) notFound();
        return (
          <div className="space-y-6 max-w-7xl mx-auto">
            <BackLink href={ROUTES.PATIENTS} label="All patients" />
            <PatientHeader patient={p} allergies={allergies} />
            <PatientChartTabs patient={p} />
          </div>
        );
      }}
    </QueryContent>
  );
}
