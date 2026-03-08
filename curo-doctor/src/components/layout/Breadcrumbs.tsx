"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  patients: "Patients",
  encounters: "Encounters",
  schedule: "Schedule",
  icd: "ICD-10",
  settings: "Settings",
  new: "New Encounter",
};

function getSegmentLabel(segment: string): string {
  if (segmentLabels[segment]) return segmentLabels[segment];
  if (segment.startsWith("pat_")) return "Patient";
  if (segment.startsWith("enc_")) return "Encounter";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const label = getSegmentLabel(segment);
        const isLast = index === segments.length - 1;

        return (
          <span key={href} className="flex items-center gap-1">
            {index === 0 && <Home className="h-3.5 w-3.5 mr-0.5" />}
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
            {isLast ? (
              <span className={cn("font-medium text-foreground")}>{label}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
