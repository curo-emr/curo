import { unwrapBundle, type FhirBundle } from "../fhir";
import { apiClient } from "./client";

/** The most rows the API returns in one page (`MAX_PAGE_SIZE` in @curo/shared). */
const PAGE_SIZE = 100;

async function getPage<T>(url: string, params: Record<string, unknown>, page = 1) {
  const res = await apiClient.get<T[] | FhirBundle<T>>(url, { params: { ...params, page, pageSize: PAGE_SIZE } });
  return unwrapBundle(res.data);
}

/**
 * Every row of a paged list, not only its first page: page 1 says how many there
 * are, then the rest come in parallel. For reads that a filter bounds, such as
 * one day's appointments or one patient's dispenses. A list of unbounded history
 * should page on the server instead (`useServerPagination`).
 */
export async function getAllPages<T>(url: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const first = await getPage<T>(url, params);
  const pageCount = Math.max(Math.ceil(first.total / PAGE_SIZE), 1);
  const rest = await Promise.all(Array.from({ length: pageCount - 1 }, (_, i) => getPage<T>(url, params, i + 2)));
  return [first, ...rest].flatMap((page) => page.resources);
}

/**
 * The resources with these ids, by FHIR `_id` search: a page of ids per request,
 * in parallel, so the URLs stay short however many rows need looking up.
 */
export async function getByIds<T>(url: string, ids: string[]): Promise<T[]> {
  const unique = [...new Set(ids)];
  const chunks = Array.from({ length: Math.ceil(unique.length / PAGE_SIZE) }, (_, i) =>
    unique.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE),
  );
  const pages = await Promise.all(chunks.map((chunk) => getPage<T>(url, { _id: chunk.join(",") })));
  return pages.flatMap((page) => page.resources);
}
