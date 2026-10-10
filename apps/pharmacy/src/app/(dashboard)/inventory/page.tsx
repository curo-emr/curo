"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { PageHeader } from "@curo/web/ui/page-header";
import { GroupedInventory } from "@/components/features/inventory/GroupedInventory";
import { stockQueries } from "@/lib/queries";

export default function InventoryPage() {
  const stock = useQuery(stockQueries.grouped());

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Inventory" description="What this pharmacy holds, by medicine. Expired batches don't count towards the quantity." />
      <QueryContent query={stock} what="the inventory">
        {groups => <GroupedInventory groups={groups} />}
      </QueryContent>
    </div>
  );
}
