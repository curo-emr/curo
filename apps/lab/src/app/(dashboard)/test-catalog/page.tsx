"use client";

import { useQuery } from "@tanstack/react-query";
import { QueryContent, allOf } from "@curo/web/query";
import { PageHeader } from "@curo/web/ui/page-header";
import { workplaceQueries } from "@curo/web/workplace";
import { TestCatalogList } from "@/components/features/test-catalog/TestCatalogList";
import { labQueries } from "@/lib/queries";

export default function TestCatalogPage() {
  const workplace = useQuery(workplaceQueries.mine());
  // The doctors choose from this list when they order from your lab.
  const catalog = useQuery({ ...labQueries.catalog(workplace.data?.id), enabled: workplace.isSuccess });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Test catalog" description="The tests your lab offers, as doctors see them when they order." />
      <QueryContent query={allOf(workplace, catalog)} what="the test catalog">
        {([, tests]) => <TestCatalogList tests={tests} />}
      </QueryContent>
    </div>
  );
}
