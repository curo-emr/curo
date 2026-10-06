"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileInput } from "@/components/ui/FileInput";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { uploadDocument } from "@/lib/api/documents";

const DOCUMENT_TYPES: { value: string; label: string }[] = [
  { value: "referral-letter", label: "Referral letter" },
  { value: "discharge-summary", label: "Discharge summary" },
  { value: "imaging", label: "Imaging" },
  { value: "lab-report", label: "Lab report" },
  { value: "consent", label: "Consent form" },
  { value: "other", label: "Other" },
];

interface Props {
  patientId: string;
  encounterId?: string;
  onUploaded?: () => void;
}

export function DocumentUpload({ patientId, encounterId, onUploaded }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<string>("referral-letter");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  function reset() {
    setFile(null);
    setType("referral-letter");
    setDescription("");
  }

  async function handleSubmit() {
    if (!file) {
      toast.error("Please choose a file to upload.");
      return;
    }
    setIsUploading(true);
    try {
      await uploadDocument({ file, patientId, type, description: description || undefined, encounterId });
      toast.success("Document uploaded.");
      setOpen(false);
      reset();
      onUploaded?.();
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Upload className="h-4 w-4" /> Upload document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            Share a document with this patient. They will be able to view it in their portal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>File</Label>
            <FileInput value={file} onChange={setFile} disabled={isUploading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-type">Type</Label>
            <Select value={type} onValueChange={setType} disabled={isUploading}>
              <SelectTrigger id="doc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-description">Description (optional)</Label>
            <Textarea
              id="doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Cardiology referral for chest pain"
              disabled={isUploading}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading || !file} className="gap-2">
            {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isUploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
