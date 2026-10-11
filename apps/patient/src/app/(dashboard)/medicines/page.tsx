"use client";

import { useQuery } from "@tanstack/react-query";
import { Ban, PackageCheck, Pill, ShoppingBag } from "lucide-react";
import { QueryContent } from "@curo/web/query";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { MyRecord } from "@/components/features/MyRecord";
import { MedicineCard } from "@/components/features/MedicineCard";
import { myQueries } from "@/lib/queries";
import type { Medicine, MedicineStatus } from "@/types";

export default function MedicinesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Medicines" description="What your doctors have prescribed, and where to collect it." />
      <MyRecord>{patient => <Medicines patientId={patient.id} />}</MyRecord>
    </div>
  );
}

function Medicines({ patientId }: { patientId: string }) {
  const list = useQuery(myQueries.medicines(patientId));
  return (
    <QueryContent query={list} what="your medicines">
      {medicines => medicines.length === 0
        ? <EmptyState icon={Pill} title="No medicines yet" description="Medicines your doctor prescribes will show here." />
        : <MedicineGroups medicines={medicines} />}
    </QueryContent>
  );
}

const GROUPS: { title: string; icon: typeof Pill; statuses: MedicineStatus[]; muted?: boolean }[] = [
  { title: "To collect", icon: ShoppingBag, statuses: ["to_collect", "on_hold"] },
  { title: "Collected", icon: PackageCheck, statuses: ["collected"] },
  { title: "Stopped", icon: Ban, statuses: ["stopped"], muted: true },
];

function MedicineGroups({ medicines }: { medicines: Medicine[] }) {
  return GROUPS.map(group => {
    const inGroup = medicines.filter(m => group.statuses.includes(m.status));
    return inGroup.length > 0 && (
      <SectionCard
        key={group.title}
        icon={group.icon}
        iconClassName={group.muted ? "text-muted-foreground" : undefined}
        title={group.title}
        count={inGroup.length}
        noPadding
      >
        <ul className="divide-y">{inGroup.map(m => <MedicineCard key={m.id} medicine={m} />)}</ul>
      </SectionCard>
    );
  });
}
