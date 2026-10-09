"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { GroupedInventory } from "@/components/features/inventory/GroupedInventory";
import { stockQueries } from "@/lib/queries";

export default function InventoryPage() {
  const stock = useQuery(stockQueries.grouped());

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Inventory</h1>
        <p className="text-sm text-muted-foreground">Stock grouped by drug — each drug can have multiple batches with different expiry dates (FEFO)</p>
      </div>

      <QueryContent query={stock} what="the inventory">
        {groups => <GroupedInventory groups={groups} />}
      </QueryContent>
    </div>
  );
}
