"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { cn } from "cn";

interface FileInputProps {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSizeMb?: number;
  disabled?: boolean;
}

const DEFAULT_ACCEPT = "application/pdf,image/jpeg,image/png";

export function formatFileSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Minimal, design-system-consistent file picker: click or drag-and-drop,
 * with client-side type/size validation. Shared across portals.
 */
export function FileInput({
  value,
  onChange,
  accept = DEFAULT_ACCEPT,
  maxSizeMb = 20,
  disabled,
}: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const allowed = accept.split(",").map((s) => s.trim());

  function validateAndSet(file: File | null) {
    setError(null);
    if (!file) {
      onChange(null);
      return;
    }
    if (allowed.length && !allowed.includes(file.type)) {
      setError("Unsupported file type. Allowed: PDF, JPG, PNG.");
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`File exceeds the ${maxSizeMb} MB limit.`);
      return;
    }
    onChange(file);
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{value.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(value.size)}</p>
          </div>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => validateAndSet(null)}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          validateAndSet(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-input hover:bg-muted/50",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <UploadCloud className="h-6 w-6 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          Click to upload <span className="text-muted-foreground">or drag and drop</span>
        </span>
        <span className="text-xs text-muted-foreground">PDF, JPG or PNG · up to {maxSizeMb} MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => validateAndSet(e.target.files?.[0] ?? null)}
      />
      {error && <p className="mt-2 text-sm text-status-error-text">{error}</p>}
    </div>
  );
}
