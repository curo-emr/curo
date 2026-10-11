"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, FlaskConical, Pill, SearchX } from "lucide-react";
import { QueryContent, allOf } from "@curo/web/query";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { DocumentList } from "@/components/features/DocumentList";
import { LabTestCard } from "@/components/features/LabTestCard";
import { MedicineCard } from "@/components/features/MedicineCard";
import { MyRecord } from "@/components/features/MyRecord";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useDoctorName } from "@/lib/hooks/useDirectory";
import { useLabWork } from "@/lib/hooks/useLabWork";
import { myQueries } from "@/lib/queries";

const BACK = { href: ROUTES.VISITS, label: "Visits" };

export default function VisitPage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = use(params);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MyRecord>{patient => <VisitDetail patientId={patient.id} visitId={visitId} />}</MyRecord>
    </div>
  );
}

function VisitDetail({ patientId, visitId }: { patientId: string; visitId: string }) {
  const doctorName = useDoctorName();
  const record = allOf(
    useQuery({ ...myQueries.visits(patientId), select: visits => visits.find(v => v.id === visitId) ?? null }),
    useQuery({ ...myQueries.medicines(patientId), select: meds => meds.filter(m => m.visitId === visitId) }),
    useLabWork(patientId),
    useQuery({ ...myQueries.documents(), select: docs => docs.filter(d => d.encounterId === visitId) }),
  );

  return (
    <QueryContent query={record} what="this visit">
      {([visit, medicines, labWork, documents]) => {
        if (!visit) return (
          <>
            <PageHeader title="Visit" back={BACK} />
            <EmptyState icon={SearchX} title="Visit not found" description="It may have been removed from your record." />
          </>
        );
        const tests = labWork.filter(w => w.test.visitId === visitId);
        return (
          <>
            <PageHeader
              title={visit.reason || `Visit with ${doctorName(visit.doctorId)}`}
              description={[formatDate(visit.start), visit.reason && doctorName(visit.doctorId)].filter(Boolean).join(" · ")}
              back={BACK}
            />
            <SectionCard icon={Pill} title="Medicines prescribed" count={medicines.length} noPadding>
              {medicines.length === 0
                ? <EmptyState title="No medicines from this visit" />
                : <ul className="divide-y">{medicines.map(m => <MedicineCard key={m.id} medicine={m} />)}</ul>}
            </SectionCard>
            <SectionCard icon={FlaskConical} title="Lab tests" count={tests.length} noPadding>
              {tests.length === 0
                ? <EmptyState title="No lab tests from this visit" />
                : <ul className="divide-y">{tests.map(w => <LabTestCard key={w.test.id} {...w} />)}</ul>}
            </SectionCard>
            {documents.length > 0 && (
              <SectionCard icon={FileText} title="Documents" count={documents.length} noPadding>
                <DocumentList documents={documents} />
              </SectionCard>
            )}
          </>
        );
      }}
    </QueryContent>
  );
}
