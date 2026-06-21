"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentUpload } from "./DocumentUpload";
import { DocumentsList } from "./DocumentsList";
import { getDocumentsByPatient, type DocumentRef } from "@/lib/api/documents";

interface Props {
  patientId: string;
}

export function DocumentsTab({ patientId }: Props) {
  const [documents, setDocuments] = useState<DocumentRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    setIsLoading(true);
    getDocumentsByPatient(patientId)
      .then(setDocuments)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted border-b flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Documents
        </CardTitle>
        <DocumentUpload patientId={patientId} onUploaded={load} />
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DocumentsList documents={documents} />
        )}
      </CardContent>
    </Card>
  );
}
