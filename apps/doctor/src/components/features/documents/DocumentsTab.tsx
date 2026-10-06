"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentUpload } from "./DocumentUpload";
import { DocumentsList } from "./DocumentsList";
import { getDocumentsByPatient, type DocumentRef } from "@/lib/api/documents";

export function DocumentsTab({ patientId }: { patientId: string }) {
  const [documents, setDocuments] = useState<DocumentRef[] | null>(null);

  const load = useCallback(
    () => getDocumentsByPatient(patientId).then(setDocuments).catch(() => setDocuments([])),
    [patientId],
  );

  useEffect(() => { load(); }, [load]);

  return (
    <SectionCard icon={FileText} title="Documents" count={documents?.length} noPadding
      headerRight={<DocumentUpload patientId={patientId} onUploaded={load} />}>
      {documents === null ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DocumentsList documents={documents} />
      )}
    </SectionCard>
  );
}
