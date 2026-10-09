/** What a screen needs from a query to show it: QueryContent and allOf take any of these. */
export interface Loadable<T> {
  data: T | undefined;
  isError: boolean;
  isFetching: boolean;
  refetch: () => unknown;
}

// Loaded data can still be null, such as a patient that wasn't found.
type LoadedData<Q extends readonly Loadable<unknown>[]> = { [K in keyof Q]: Exclude<Q[K]["data"], undefined> };

/**
 * Queries a section needs together, as one: their data once every one has
 * loaded, failed if any failed, and a retry that refetches only the ones that did.
 */
export function allOf<const Q extends readonly Loadable<unknown>[]>(...queries: Q): Loadable<LoadedData<Q>> {
  const loaded = queries.every((q) => q.data !== undefined);
  return {
    data: loaded ? (queries.map((q) => q.data) as LoadedData<Q>) : undefined,
    isError: queries.some((q) => q.isError),
    isFetching: queries.some((q) => q.isFetching),
    refetch: () => Promise.all(queries.filter((q) => q.isError).map((q) => q.refetch())),
  };
}
