/**
 * FHIR Bundle and pagination types, and the helpers the portals' API modules use.
 *
 * List API methods route their response through `unwrapBundle`, which accepts
 * BOTH a legacy bare array of resources AND a FHIR searchset Bundle. This makes
 * the portals tolerant of the backend before/after it switches to Bundles.
 */

export interface FhirBundleEntry<T> {
  resource: T;
}

export interface FhirBundleLink {
  relation: string;
  url: string;
}

export interface FhirBundle<T> {
  resourceType: "Bundle";
  type: string;
  total?: number;
  link?: FhirBundleLink[];
  entry?: FhirBundleEntry<T>[];
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function isFhirBundle<T>(data: unknown): data is FhirBundle<T> {
  return (
    !!data &&
    typeof data === "object" &&
    (data as { resourceType?: unknown }).resourceType === "Bundle"
  );
}

/**
 * Accepts either a bare array of resources (legacy) or a FHIR searchset Bundle
 * and returns a uniform { resources, total }.
 */
export function unwrapBundle<T>(
  data: T[] | FhirBundle<T> | null | undefined,
): { resources: T[]; total: number } {
  if (Array.isArray(data)) {
    return { resources: data, total: data.length };
  }
  if (isFhirBundle<T>(data)) {
    const resources = (data.entry ?? []).map((e) => e.resource);
    return { resources, total: data.total ?? resources.length };
  }
  return { resources: [], total: 0 };
}

/** Builds the axios query params for a paginated request. */
export function paginationParams(params?: PaginationParams): Record<string, unknown> {
  if (!params) return {};
  const out: Record<string, unknown> = {};
  if (params.page != null) out.page = params.page;
  if (params.pageSize != null) out.pageSize = params.pageSize;
  if (params.search != null && params.search !== "") out.search = params.search;
  return out;
}

export * from "./allergy";
export * from "./patient";
