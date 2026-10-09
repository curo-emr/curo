"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { UserX } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { EncounterEditor } from "@/components/features/encounters/EncounterEditor";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { appointmentQueries, catalogQueries, patientQueries } from "@/lib/queries";
import { getTodayString } from "@/lib/utils";

export default function NewVisitPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const appointmentParam = useSearchParams().get("appointmentId") ?? undefined;
  const patient = useQuery(patientQueries.detail(patientId));
  // Started from the chart? Attach the visit to the patient's open appointment today.
  // Read fresh once, then kept: the draft and the queue updates are keyed by it.
  const todays = useQuery({
    ...appointmentQueries.todaysFor(patientId),
    enabled: !appointmentParam,
    refetchOnMount: "always",
    staleTime: Infinity,
  });
  // Opened from the queue: today's list (usually cached by the Today screen) has the booking's reason.
  const queue = useQuery({ ...appointmentQueries.day(getTodayString()), enabled: !!appointmentParam });
  const appointment = appointmentParam ? queue.data?.find(a => a.id === appointmentParam) : todays.data;
  // Pickers: if one fails it stays empty, and the rest of the visit still works.
  const medicationSuggestions = useQuery(catalogQueries.medicationSuggestions()).data ?? [];
  const labTests = useQuery(catalogQueries.labTests()).data ?? [];
  const labs = useQuery(catalogQueries.labs()).data ?? [];

  // The editor reads its autosaved draft once, keyed by the appointment, so it
  // waits for that. Later refreshes of the patient never unmount it.
  if (!appointmentParam && !todays.isFetchedAfterMount) return <PageSkeleton />;

  return (
    <QueryContent query={patient} what="this patient" loading={<PageSkeleton />}>
      {p => p ? (
        <EncounterEditor
          patient={p}
          appointmentId={appointmentParam ?? todays.data?.id}
          reason={appointment?.reason}
          medicationSuggestions={medicationSuggestions}
          labTestsCatalog={labTests}
          labs={labs}
        />
      ) : (
        <EmptyState icon={UserX} title="Patient not found" className="min-h-[50vh]" />
      )}
    </QueryContent>
  );
}
