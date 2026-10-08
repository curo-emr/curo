"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { useAuth } from "@/contexts/AuthContext";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { PatientHeader } from "@/components/features/patients/PatientHeader";
import { PatientChartTabs } from "@/components/features/patients/PatientChartTabs";
import { appointmentQueries, patientQueries } from "@/lib/queries";
import { hasDraft, visitDraftKey } from "@/lib/visit";

// The header and each tab load their own part of the record, so one failing shows as such.
export default function PatientChartPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const { user } = useAuth();
  const patient = useQuery(patientQueries.detail(patientId));
  const todaysAppointment = useQuery(appointmentQueries.todaysFor(patientId)).data ?? null;

  return (
    <QueryContent query={patient} what="this patient" loading={<PageSkeleton side={false} />}>
      {p => {
        if (!p) notFound();
        const draft = !!user && hasDraft(visitDraftKey(user.id, p.id, todaysAppointment?.id));
        return (
          <div className="space-y-6">
            <PatientHeader patient={p} todaysAppointment={todaysAppointment} hasDraft={draft} />
            <PatientChartTabs patient={p} />
          </div>
        );
      }}
    </QueryContent>
  );
}
