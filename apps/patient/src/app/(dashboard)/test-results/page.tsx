"use client";

import { CheckCircle2, FlaskConical, Hourglass, Info } from "lucide-react";
import { QueryContent } from "@curo/web/query";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { LabTestCard } from "@/components/features/LabTestCard";
import { MyRecord } from "@/components/features/MyRecord";
import { useLabWork, type LabWork } from "@/lib/hooks/useLabWork";

export default function TestResultsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Test results" description="The lab tests your doctors asked for, and their results." />
      <MyRecord>{patient => <TestResults patientId={patient.id} />}</MyRecord>
    </div>
  );
}

function TestResults({ patientId }: { patientId: string }) {
  const work = useLabWork(patientId);
  return (
    <QueryContent query={work} what="your test results">
      {items => items.length === 0
        ? <EmptyState icon={FlaskConical} title="No lab tests yet" description="Tests your doctor asks for will show here." />
        : <Tests items={items} />}
    </QueryContent>
  );
}

function Tests({ items }: { items: LabWork[] }) {
  const waiting = items.filter(w => w.test.status === "ordered" || w.test.status === "in_lab");
  const done = items.filter(w => w.test.status === "done");

  return (
    <>
      {waiting.length > 0 && (
        <SectionCard icon={Hourglass} iconClassName="text-status-warning-text" title="Waiting for results" count={waiting.length} noPadding>
          <ul className="divide-y">{waiting.map(w => <LabTestCard key={w.test.id} {...w} />)}</ul>
        </SectionCard>
      )}
      {done.length > 0 && (
        <SectionCard icon={CheckCircle2} iconClassName="text-status-success-text" title="Results" count={done.length} noPadding>
          <p className="flex items-start gap-2 border-b bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            Your doctor will go through your results with you. A flag means a value is outside the usual range.
          </p>
          <ul className="divide-y">{done.map(w => <LabTestCard key={w.test.id} {...w} />)}</ul>
        </SectionCard>
      )}
    </>
  );
}
