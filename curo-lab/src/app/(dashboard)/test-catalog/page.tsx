"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { TestCatalogList } from "@/components/features/test-catalog/TestCatalogList";
import { getLabTestCatalog } from "@/lib/data/api";
import type { LabTestCatalogItem } from "@/types";

export default function TestCatalogPage() {
  const [tests, setTests] = useState<LabTestCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getLabTestCatalog().then(setTests).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Test Catalog</h1>
        <p className="text-sm text-muted-foreground">Browse available laboratory tests, reference ranges, and pricing</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <TestCatalogList tests={tests} />
      )}
    </div>
  );
}
