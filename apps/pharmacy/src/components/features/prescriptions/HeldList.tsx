import Link from "next/link";
import { PauseCircle } from "lucide-react";
import { Button } from "@curo/web/ui/button";
import { SectionCard } from "@curo/web/ui/section-card";
import { ROUTES } from "@/lib/constants";
import { medicineName } from "@/lib/prescriptions";
import type { Patient, Prescription } from "@/types";

interface HeldListProps {
  held: Prescription[];
  patients: Patient[];
}

// Prescriptions set aside, each with why; opening one is where it is released.
export function HeldList({ held, patients }: HeldListProps) {
  if (held.length === 0) return null;
  const byId = new Map(patients.map(p => [p.id, p]));

  return (
    <SectionCard icon={PauseCircle} iconClassName="text-status-warning-text" title="On hold" count={held.length} noPadding>
      <ul className="divide-y">
        {held.map(rx => (
          <li key={rx.id} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-foreground">
                {byId.get(rx.patientId)?.name.full ?? "Unknown patient"} · {medicineName(rx)}
              </p>
              <p className="truncate text-muted-foreground">{rx.holdReason || "No reason given"}</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={ROUTES.PRESCRIPTION(rx.id)}>Open</Link>
            </Button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
