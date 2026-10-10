"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Upload, Eye, Loader2 } from "lucide-react";
import { Button } from "@curo/web/ui/button";
import { Label } from "@curo/web/ui/label";
import { Textarea } from "@curo/web/ui/textarea";
import { FileInput, formatFileSize } from "@curo/web/ui/file-input";
import { SectionCard } from "@curo/web/ui/section-card";
import { formatDate } from "@/lib/utils";
import { uploadDocument, openDocument } from "@/lib/api/documents";
import { LAB_REPORT_DOCUMENT } from "@/lib/api/lab";
import { orderQueries } from "@/lib/queries";

interface Props {
  orderId: string;
  patientId: string;
  encounterId?: string;
}

/** Report files for an order, as the lab's analyser or a scan produced them. The ordering doctor sees them too. */
export function LabReportUpload({ orderId, patientId, encounterId }: Props) {
  const queryClient = useQueryClient();
  const reportsQuery = useQuery(orderQueries.reports(orderId));
  const reports = reportsQuery.data ?? [];
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadDocument({
        file,
        patientId,
        type: LAB_REPORT_DOCUMENT,
        description: description || undefined,
        encounterId,
        relatedResourceId: orderId,
        relatedResourceType: "ServiceRequest",
      });
      toast.success("Report uploaded.");
      setFile(null);
      setDescription("");
      void queryClient.invalidateQueries({ queryKey: orderQueries.reports(orderId).queryKey });
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleView(id: string) {
    setOpeningId(id);
    try {
      await openDocument(id);
    } catch (err) {
      console.error(err);
      toast.error("Could not open the report.");
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <SectionCard
      icon={FileText}
      iconClassName="text-primary"
      title="Report files"
      count={reports.length}
      description="Optional. A PDF or photo of the analyser's report; the doctor sees it with the results."
    >
      <div className="space-y-4">
        {reportsQuery.isError && !reportsQuery.data && (
          <p className="text-sm text-status-error-text">The report files couldn&apos;t be loaded.</p>
        )}
        {reports.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {reports.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{doc.fileName || "Report"}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.date ? formatDate(doc.date) : ""}
                      {doc.size ? ` · ${formatFileSize(doc.size)}` : ""}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => handleView(doc.id)} disabled={openingId === doc.id}>
                  {openingId === doc.id ? <Loader2 className="animate-spin" /> : <Eye />}
                  View
                </Button>
              </li>
            ))}
          </ul>
        )}

        <FileInput value={file} onChange={setFile} disabled={isUploading} />
        {file && (
          <>
            <div className="space-y-2">
              <Label htmlFor="report-description">Description (optional)</Label>
              <Textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Full blood count report"
                rows={2}
                disabled={isUploading}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleUpload} disabled={isUploading}>
                {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
                {isUploading ? "Uploading…" : "Upload report"}
              </Button>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
