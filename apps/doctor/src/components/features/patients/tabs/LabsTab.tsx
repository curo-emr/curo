"use client";

import { FlaskConical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { SectionCard } from "@curo/web/ui/section-card";
import { EmptyState } from "@curo/web/ui/empty-state";
import { patientQueries } from "@/lib/queries";
import { LabOrderList } from "@/components/features/labs/LabOrderList";

export function LabsTab({ patientId }: { patientId: string }) {
  const labOrders = useQuery(patientQueries.labOrders(patientId));
  return (
    <SectionCard icon={FlaskConical} title="Lab orders" count={labOrders.data?.length} noPadding>
      <QueryContent query={labOrders} what="lab orders">
        {orders => orders.length === 0
          ? <EmptyState icon={FlaskConical} title="No lab orders yet" description="Tests you order during a visit appear here." />
          : <LabOrderList patientId={patientId} orders={orders} />}
      </QueryContent>
    </SectionCard>
  );
}
