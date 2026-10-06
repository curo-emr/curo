"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { GroupedInventory } from "@/components/features/inventory/GroupedInventory";
import { getGroupedStock, type GroupedStock } from "@/lib/api/pharmacy";

export default function InventoryPage() {
  const [groups, setGroups] = useState<GroupedStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getGroupedStock().then(setGroups).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Inventory</h1>
        <p className="text-sm text-muted-foreground">Stock grouped by drug — each drug can have multiple batches with different expiry dates (FEFO)</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <GroupedInventory groups={groups} />
      )}
    </div>
  );
}
