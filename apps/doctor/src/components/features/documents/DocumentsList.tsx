"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Eye, Loader2 } from "lucide-react";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import { EmptyState } from "@curo/web/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { formatStatus } from "@curo/web/format";
import { formatFileSize } from "@curo/web/ui/file-input";
import { openDocument, type DocumentRef } from "@/lib/api/documents";

interface Props {
  documents: DocumentRef[];
}

export function DocumentsList({ documents }: Props) {
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function handleView(id: string) {
    setOpeningId(id);
    try {
      await openDocument(id);
    } catch (err) {
      console.error(err);
      toast.error("Could not open the document.");
    } finally {
      setOpeningId(null);
    }
  }

  if (documents.length === 0) {
    return <EmptyState icon={FileText} title="No documents yet" description="Upload referral letters, scans or reports." />;
  }

  return (
    <div className="divide-y">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
          <div className="flex items-start gap-3 min-w-0">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="truncate font-medium text-foreground">{doc.fileName || "Document"}</span>
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  {formatStatus(doc.type)}
                </Badge>
              </div>
              {doc.description && <p className="mt-1 text-sm text-muted-foreground">{doc.description}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {doc.date ? formatDate(doc.date) : ""}
                {doc.size ? ` · ${formatFileSize(doc.size)}` : ""}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => handleView(doc.id)}
            disabled={openingId === doc.id}
          >
            {openingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            View
          </Button>
        </div>
      ))}
    </div>
  );
}
