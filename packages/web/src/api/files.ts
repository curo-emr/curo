import { apiClient } from "./client";

/** Opens `blob` in a new tab; the URL is released once the tab has had time to load it. */
function openBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Opens a stored document. Its bytes come through the authenticated client: the
 * token lives in localStorage, so a plain link would get a 401.
 */
export async function openDocument(id: string): Promise<void> {
  const res = await apiClient.get<Blob>(`/documents/${id}/content`, { responseType: "blob" });
  openBlob(res.data);
}

/** Opens a base64 PDF, such as the report the lab service makes from typed results. */
export function openPdf(base64: string): void {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  openBlob(new Blob([bytes], { type: "application/pdf" }));
}
