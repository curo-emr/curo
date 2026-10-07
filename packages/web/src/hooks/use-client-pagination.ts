import { useMemo, useState } from "react";

/**
 * Client-side pagination over an already-filtered list. Changing the page size,
 * or any value in `resetOn` (typically the active filters), returns to page 1.
 */
export function useClientPagination<T>(rows: T[], resetOn: readonly unknown[]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(25);

  // Adjust state while rendering rather than in an effect, so the stale page
  // is never shown (https://react.dev/learn/you-might-not-need-an-effect).
  const resetKey = JSON.stringify(resetOn);
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setPage(1);
  }

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const pageRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  );

  return { page, setPage, pageSize, setPageSize, pageRows };
}
