"use client";

import { useState, useEffect } from "react";
import { Search, Stethoscope } from "lucide-react";
import type { ICD10 } from "@/types";
import { Card } from "@curo/web/ui/card";
import { Input } from "@curo/web/ui/input";
import { Skeleton } from "@curo/web/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@curo/web/ui/pagination";
import { getICD10Paginated } from "@/lib/api/icd";

export function ICDSearchClient() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [data, setData] = useState<{ items: ICD10[]; total: number } | null>(null);
  const [error, setError] = useState(false);

  // A new search starts back at page 1.
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(query); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let active = true;
    getICD10Paginated({ page, pageSize, search: debouncedQuery || undefined })
      .then(r => { if (active) { setData({ items: r.items, total: r.total }); setError(false); } })
      .catch(() => { if (active) { setData({ items: [], total: 0 }); setError(true); } });
    return () => { active = false; };
  }, [page, pageSize, debouncedQuery]);

  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search ICD-10"
            value={query}
            onChange={e => setQuery(e.target.value)}
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
        {data === null ? (
          <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={Stethoscope} title={error ? "Couldn't load ICD-10 codes" : "No matching diagnoses"} description={error ? undefined : "Try a different term or code."} />
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
