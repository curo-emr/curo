/**
 * Shared FHIR searchset + pagination helpers.
 *
 * `parsePagination` reads page/pageSize plus the FHIR `_count`/`_offset` aliases;
 * `toSearchset` wraps a page of resources in a FHIR Bundle (type: searchset).
 */

export interface PaginationQuery {
  page?: string | number;
  pageSize?: string | number;
  _count?: string | number;
  _offset?: string | number;
}

/** Pagination plus a free-text `search` term. */
export type SearchQuery = PaginationQuery & { search?: string };

export interface Pagination {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function parsePagination(
  query: PaginationQuery = {},
  defaultPageSize = DEFAULT_PAGE_SIZE,
): Pagination {
  const rawSize = query.pageSize ?? query._count;
  let pageSize = Number(rawSize);
  if (!Number.isFinite(pageSize) || pageSize <= 0) pageSize = defaultPageSize;
  pageSize = Math.min(Math.max(Math.floor(pageSize), 1), MAX_PAGE_SIZE);

  let page = Number(query.page);
  if (!Number.isFinite(page) || page < 1) page = 1;
  page = Math.floor(page);

  let skip = (page - 1) * pageSize;

  // FHIR `_offset` (when present) takes precedence and re-derives the page.
  if (query._offset != null && String(query._offset) !== '') {
    const offset = Number(query._offset);
    if (Number.isFinite(offset) && offset >= 0) {
      skip = Math.floor(offset);
      page = Math.floor(skip / pageSize) + 1;
    }
  }

  return { page, pageSize, skip, take: pageSize };
}

export interface BundleLink {
  relation: string;
  url: string;
}

export interface Searchset<T> {
  resourceType: 'Bundle';
  type: 'searchset';
  total: number;
  link: BundleLink[];
  entry: Array<{ resource: T }>;
}

export interface SearchsetOptions {
  page: number;
  pageSize: number;
  /** Path used to build self/next/previous links, e.g. '/patients'. */
  baseUrl?: string;
  /** Filter params to preserve in the generated links. */
  query?: Record<string, string | number | boolean | null | undefined>;
}

export function toSearchset<T>(
  resources: T[],
  total: number,
  opts: SearchsetOptions,
): Searchset<T> {
  const { page, pageSize, baseUrl } = opts;
  const link: BundleLink[] = [];

  if (baseUrl) {
    const build = (p: number) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(opts.query ?? {})) {
        if (v != null && String(v) !== '') params.set(k, String(v));
      }
      params.set('page', String(p));
      params.set('pageSize', String(pageSize));
      return `${baseUrl}?${params.toString()}`;
    };
    link.push({ relation: 'self', url: build(page) });
    if (page * pageSize < total)
      link.push({ relation: 'next', url: build(page + 1) });
    if (page > 1) link.push({ relation: 'previous', url: build(page - 1) });
  }

  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total,
    link,
    entry: resources.map((resource) => ({ resource })),
  };
}
