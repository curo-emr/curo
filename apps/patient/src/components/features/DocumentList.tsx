"use client";

import { Eye, FileText, Loader2 } from "lucide-react";
import { openDocument } from "@curo/web/api";
import { Button } from "@curo/web/ui/button";
import type { DocumentRef } from "@/lib/api/documents";
import { formatDate } from "@/lib/format";
import { useOpener } from "@/lib/hooks/useOpener";

function fileSize(bytes?: number): string {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Documents the clinic has shared, each opened in a new tab.
export function DocumentList({ documents }: { documents: DocumentRef[] }) {
  const { opening, open } = useOpener();

  return (
    <ul className="divide-y">
      {documents.map(doc => (
        <li key={doc.id} className="flex items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <FileText className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{doc.fileName || "Document"}</p>
              {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
              <p className="text-xs text-muted-foreground">
                {[doc.date && formatDate(doc.date), fileSize(doc.size)].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" disabled={opening === doc.id} onClick={() => open(doc.id, () => openDocument(doc.id))}>
            {opening === doc.id ? <Loader2 className="animate-spin" /> : <Eye />} View
          </Button>
        </li>
      ))}
    </ul>
  );
}
