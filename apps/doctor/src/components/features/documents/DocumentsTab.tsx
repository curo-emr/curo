"use client";

import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { QueryContent } from "@curo/web/query";
import { SectionCard } from "@curo/web/ui/section-card";
import { DocumentUpload } from "./DocumentUpload";
import { DocumentsList } from "./DocumentsList";
import { patientQueries } from "@/lib/queries";

export function DocumentsTab({ patientId }: { patientId: string }) {
  const documents = useQuery(patientQueries.documents(patientId));

  return (
    <SectionCard icon={FileText} title="Documents" count={documents.data?.length} noPadding
      headerRight={<DocumentUpload patientId={patientId} />}>
      <QueryContent query={documents} what="documents">
        {list => <DocumentsList documents={list} />}
      </QueryContent>
    </SectionCard>
  );
}
