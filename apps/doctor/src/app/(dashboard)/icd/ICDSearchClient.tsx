"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@curo/web/hooks";
import { LoadError } from "@curo/web/ui/load-error";
import { Search, Stethoscope } from "lucide-react";
import { Card } from "@curo/web/ui/card";
import { Input } from "@curo/web/ui/input";
import { Skeleton } from "@curo/web/ui/skeleton";
import { EmptyState } from "@curo/web/ui/empty-state";
import { Pagination } from "@curo/web/ui/pagination";
import { catalogQueries } from "@/lib/queries";

export function ICDSearchClient() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  // The search waits until typing pauses.
  const debouncedQuery = useDebouncedValue(query);
  const result = useQuery(catalogQueries.icd10({ page, pageSize, search: debouncedQuery || undefined }));
  const data = result.data;

  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search ICD-10"
            value={query}
            // A new search starts at page 1.
            onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder="e.g. J45, asthma, chest pain…"
            className="h-12 bg-card pl-11 text-base"
            autoComplete="off"
            autoFocus
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} {total === 1 ? "code" : "codes"}{debouncedQuery ? ` matching “${debouncedQuery}”` : ""}
        </p>
      </div>

      <Card className="gap-0 py-0">
        {!data && result.isError ? (
          <LoadError what="ICD-10 codes" onRetry={() => void result.refetch()} retrying={result.isFetching} />
        ) : !data ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={Stethoscope} title="No matching diagnoses" description="Try a different term or code." />
        ) : (
          <ul className="divide-y">
            {data.items.map(icd => (
              <li key={icd.code} className="flex flex-col gap-1.5 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
                <span className="w-24 shrink-0 font-mono text-sm font-semibold text-primary">{icd.code}</span>
                <span className="flex-1 text-sm font-medium text-foreground">{icd.name}</span>
                {(icd.keywords ?? []).length > 0 && (
                  <span className="flex flex-wrap gap-1.5">
                    {icd.keywords.slice(0, 4).map(k => <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{k}</span>)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
    </div>
  );
}
