"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ClipboardList } from "lucide-react";
import { QueryContent, allOf } from "@curo/web/query";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { MyRecord } from "@/components/features/MyRecord";
import { ROUTES } from "@/lib/constants";
import { formatDate, plural } from "@/lib/format";
import { useDoctorName } from "@/lib/hooks/useDirectory";
import { myQueries } from "@/lib/queries";
import type { LabTest, Medicine, Visit } from "@/types";

export default function VisitsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Visits" description="Your visits to the doctor, and what came of each one." />
      <MyRecord>{patient => <Visits patientId={patient.id} />}</MyRecord>
    </div>
  );
}

function Visits({ patientId }: { patientId: string }) {
  const record = allOf(
    useQuery(myQueries.visits(patientId)),
    useQuery(myQueries.medicines(patientId)),
    useQuery(myQueries.labTests(patientId)),
  );
  return (
    <QueryContent query={record} what="your visits">
      {([visits, medicines, tests]) => {
        const seen = visits.filter(v => v.status !== "cancelled");
        return seen.length === 0
          ? <EmptyState icon={ClipboardList} title="No visits yet" description="Your visits to the doctor will show here." />
          : (
            <SectionCard icon={ClipboardList} title="Your visits" count={seen.length} noPadding>
              <ul className="divide-y">
                {seen.map(v => <VisitRow key={v.id} visit={v} medicines={medicines} tests={tests} />)}
              </ul>
            </SectionCard>
          );
      }}
    </QueryContent>
  );
}

function VisitRow({ visit, medicines, tests }: { visit: Visit; medicines: Medicine[]; tests: LabTest[] }) {
  const doctorName = useDoctorName();
  const outcome = [
    [medicines.filter(m => m.visitId === visit.id).length, "medicine"],
    [tests.filter(t => t.visitId === visit.id).length, "lab test"],
  ] as const;

  return (
    <li>
      <Link href={ROUTES.VISIT(visit.id)} className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{visit.reason || `Visit with ${doctorName(visit.doctorId)}`}</p>
          <p className="text-sm text-muted-foreground">
            {[formatDate(visit.start), visit.reason && doctorName(visit.doctorId)].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {outcome.filter(([n]) => n > 0).map(([n, noun]) => plural(n, noun)).join(" · ") || "No medicines or tests"}
            {visit.status === "in_progress" && " · In progress"}
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}
