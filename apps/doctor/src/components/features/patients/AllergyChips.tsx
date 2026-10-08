"use client";

import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { dataOrNull } from "@curo/web/query";
import { cn } from "@/lib/utils";
import { patientQueries } from "@/lib/queries";

const ALLERGIES_UNAVAILABLE = "Allergies couldn't be loaded. Check with the patient before prescribing.";

/**
 * The patient's allergies; null when they couldn't be loaded, which must never
 * read as "no known allergies"; undefined while they load.
 */
export const usePatientAllergies = (patientId: string) => dataOrNull(useQuery(patientQueries.allergies(patientId)));

// The patient's allergies as chips, or a line saying there are none or that they couldn't be loaded.
export function AllergyChips({ patientId, className }: { patientId: string; className?: string }) {
  const allergies = usePatientAllergies(patientId);

  if (allergies === undefined) return null;
  if (allergies === null) {
    return (
      <p className={cn("flex items-center gap-1.5 text-xs font-medium text-status-warning-text", className)}>
        <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> {ALLERGIES_UNAVAILABLE}
      </p>
    );
  }
  if (allergies.length === 0) {
    return (
      <p className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <ShieldCheck className="h-3.5 w-3.5" /> No known allergies
      </p>
    );
  }
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-status-error-text">
        <AlertTriangle className="h-3.5 w-3.5" /> Allergies
      </span>
      {allergies.map(a => (
        <span key={a.id} className="rounded-full border border-status-error-border bg-status-error-bg px-2 py-px text-xs font-medium text-status-error-text">
          {a.substance}{a.reaction ? ` · ${a.reaction}` : ""}
        </span>
      ))}
    </div>
  );
}
