"use client";

import { useEffect, useState, use } from "react";
import { ArrowLeft, ClipboardList, FileText, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@curo/web/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { EmptyState } from "@curo/web/ui/empty-state";
import { formatDate, getDoctorName } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import type { Encounter } from "@/types";
import { getMyProfile, getMyEncounters, getPractitioners } from "@/lib/api/patient-portal";
import { getMyDocuments, openDocument, type DocumentRef } from "@/lib/api/documents";

function formatFileSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VisitDetailPage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = use(params);

  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [doctors, setDoctors] = useState<{ id: string; name: { full: string } }[]>([]);
  const [documents, setDocuments] = useState<DocumentRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const profile = await getMyProfile();
        if (!profile) return;
        const [encs, docs, allDocuments] = await Promise.all([
          getMyEncounters(profile.id),
          getPractitioners(),
          getMyDocuments(),
        ]);
        setEncounter(encs.find((e) => e.id === visitId) ?? null);
        setDoctors(docs);
        setDocuments(allDocuments.filter((d) => d.encounterId === visitId));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [visitId]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.VISITS}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Visit Details</h1>
      </div>

      {encounter ? (
        <Card className="shadow-sm border">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-primary" /> {encounter.chiefComplaint || "Visit"}
              </CardTitle>
              <StatusBadge status={encounter.status} />
            </div>
          </CardHeader>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {getDoctorName(encounter.doctorId, doctors)} &middot; {formatDate(encounter.startedAt)}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border">
          <CardContent className="py-8 text-center text-muted-foreground">
            Visit summary is available to your care team.
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" /> Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <EmptyState title="No documents have been shared for this visit." />
          ) : (
            <div className="divide-y divide-border">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{doc.fileName || "Document"}</p>
                      {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                      <p className="text-xs text-muted-foreground">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
