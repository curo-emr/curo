"use client";

import { QueryContent } from "@curo/web/query";
import { PageHeader } from "@curo/web/ui/page-header";
import { TestCatalogList } from "@/components/features/test-catalog/TestCatalogList";
import { useMyCatalog } from "@/lib/catalog";

export default function TestCatalogPage() {
  const catalog = useMyCatalog();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Test catalog" description="The tests your lab offers, as doctors see them when they order." />
      <QueryContent query={catalog} what="the test catalog">
        {tests => <TestCatalogList tests={tests} />}
      </QueryContent>
    </div>
  );
}
