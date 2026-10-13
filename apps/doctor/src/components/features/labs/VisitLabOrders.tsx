"use client";

import { FlaskConical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import type { LabOrder } from "@/types";
import { EmptyState } from "@curo/web/ui/empty-state";
import { SectionCard } from "@curo/web/ui/section-card";
import { patientQueries } from "@/lib/queries";
import { LabOrderList } from "./LabOrderList";

/** The visit's lab orders. */
export function useVisitLabOrders(patientId: string, encounterId: string) {
  return useQuery({
    ...patientQueries.labOrders(patientId),
    select: (orders: LabOrder[]) => orders.filter(o => o.encounterId === encounterId),
  });
}

export function VisitLabOrders({ patientId, encounterId }: { patientId: string; encounterId: string }) {
  const orders = useVisitLabOrders(patientId, encounterId);

  return (
    <SectionCard icon={FlaskConical} iconClassName="text-clinical-lab" title="Lab orders" count={orders.data?.length} noPadding>
      <QueryContent query={orders} what="lab orders">
        {list => list.length === 0
          ? <EmptyState title="No lab orders" className="py-6" />
          : <LabOrderList patientId={patientId} orders={list} />}
      </QueryContent>
    </SectionCard>
  );
}
