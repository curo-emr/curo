import { useEffect, useEffectEvent, useState } from "react";

export interface Page<T> {
  items: T[];
  total: number;
}

/**
 * Server-side pagination: fetches the current page whenever the page, the page
 * size or any value in `filters` changes. Changing the page size or the filters
 * returns to page 1. A response that lands after a newer request started is
 * dropped. `fetchPage` may resolve more than `items` and `total` (say, lookups
 * for the rows on the page); the whole result comes back as `data`.
 */
export function useServerPagination<R extends Page<unknown>>(
  fetchPage: (page: number, pageSize: number) => Promise<R>,
  filters: readonly unknown[] = [],
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(25);

  // Adjust state while rendering rather than in an effect, so the stale page
  // is never requested (https://react.dev/learn/you-might-not-need-an-effect).
  const filterKey = JSON.stringify(filters);
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  // The latest result remembers which request it answers: until the current
  // request lands, the page shows as loading.
  const requestKey = JSON.stringify([filterKey, page, pageSize]);
  const [result, setResult] = useState<{ key: string; data?: R; failed?: true }>();

  const load = useEffectEvent(() => fetchPage(page, pageSize));
  useEffect(() => {
    let current = true;
    load().then(
      (data) => {
        if (current) setResult({ key: requestKey, data });
      },
      (error: unknown) => {
        if (!current) return;
        console.error(error);
        setResult({ key: requestKey, failed: true });
      },
    );
    return () => {
      current = false;
    };
  }, [requestKey]);

  const isLoading = result?.key !== requestKey;
  const items: R["items"][number][] = result?.data?.items ?? [];

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    data: result?.data,
    items,
    total: result?.data?.total ?? 0,
    isLoading,
    isError: !isLoading && result.failed === true,
  };
}
