"use client";

import type { ReactNode } from "react";
import { LoadError } from "../ui/load-error";
import { Skeleton } from "../ui/skeleton";
import type { Loadable } from "./all-of";

/**
 * A query's data where a failed load must not look empty, such as allergies:
 * the data when there is some (kept even if a later refresh failed), null when
 * it couldn't be loaded, undefined while the first load is pending. Only for
 * data that is never null itself, or the two would be confused.
 */
export function dataOrNull<T extends NonNullable<unknown>>(
  query: Pick<Loadable<T>, "data" | "isError">,
): T | null | undefined {
  if (query.data !== undefined) return query.data;
  return query.isError ? null : undefined;
}

const DefaultLoading = () => (
  <div className="space-y-3 p-5">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
  </div>
);

interface QueryContentProps<T> {
  /** One query, or several as one with allOf. */
  query: Loadable<T>;
  /** Names what failed, as in "Couldn't load visits". */
  what: string;
  /** Shown only for the first load: a background refresh keeps showing the data. */
  loading?: ReactNode;
  /** In place of the default LoadError, for spaces too small for it. */
  error?: ReactNode;
  children: (data: T) => ReactNode;
}

/** Renders a section from its query: a skeleton, then the data, or a load error with "Try again". */
export function QueryContent<T>({ query, what, loading = <DefaultLoading />, error, children }: QueryContentProps<T>) {
  // Data first: a refresh that failed keeps showing what was loaded.
  if (query.data !== undefined) return children(query.data);
  if (query.isError) return error ?? <LoadError what={what} onRetry={() => void query.refetch()} retrying={query.isFetching} />;
  return loading;
}
