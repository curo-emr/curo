"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Upload, Eye, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileInput, formatFileSize } from "@/components/ui/FileInput";
import { formatDate } from "@/lib/utils";
import {
  getDocumentsByPatient, uploadDocument, openDocument, type DocumentRef,
} from "@/lib/api/documents";
import { LAB_REPORT_DOCUMENT } from "@/lib/api/lab";

interface Props {
  orderId: string;
  patientId: string;
  encounterId?: string;
  /** Told how many report files the order has, whenever the list loads. */
  onReportsChange?: (count: number) => void;
}

/** Report files for an order, as the lab's analyser or a scan produced them. The ordering doctor sees them too. */
export function LabReportUpload({ orderId, patientId, encounterId, onReportsChange }: Props) {
  const [reports, setReports] = useState<DocumentRef[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(() => {
    getDocumentsByPatient(patientId)
      .then((docs) => {
        const forOrder = docs.filter((d) => d.type === LAB_REPORT_DOCUMENT && d.relatedResourceId === orderId);
        setReports(forOrder);
        onReportsChange?.(forOrder.length);
      })
      .catch(console.error);
  }, [patientId, orderId, onReportsChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload() {
    if (!file) {
      toast.error("Please choose a report file.");
      return;
    }
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
      load();
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
    <Card className="shadow-sm border">
      <CardHeader className="border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> Report attachments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {reports.length > 0 && (
          <div className="divide-y rounded-lg border">
            {reports.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{doc.fileName || "Report"}</p>
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

        <div className="space-y-2">
          <Label>Upload report (PDF or image)</Label>
          <FileInput value={file} onChange={setFile} disabled={isUploading} />
        </div>
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
          <Button onClick={handleUpload} disabled={isUploading || !file} className="gap-2">
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? "Uploading…" : "Upload report"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
