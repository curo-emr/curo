"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { TestCatalogList } from "@/components/features/test-catalog/TestCatalogList";
import { labQueries } from "@/lib/queries";

export default function TestCatalogPage() {
  const catalog = useQuery(labQueries.catalog());

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Test Catalog</h1>
        <p className="text-sm text-muted-foreground">Browse available laboratory tests, reference ranges, and pricing</p>
      </div>

      <QueryContent query={catalog} what="the test catalog">
        {tests => <TestCatalogList tests={tests} />}
      </QueryContent>
    </div>
  );
}
