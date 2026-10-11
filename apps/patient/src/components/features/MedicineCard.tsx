"use client";

import { Phone, Store } from "lucide-react";
import { frequencyLabel } from "@curo/web/clinical";
import { formatStatus } from "@curo/web/format";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { useDoctorName, usePharmacy } from "@/lib/hooks/useDirectory";
import { formatDate, plural } from "@/lib/format";
import { MEDICINE_STATUS } from "@/lib/status";
import type { Medicine } from "@/types";

/** How to take it in one line, e.g. "1 tablet · Twice a day · Oral · for 30 days". */
export function howToTake(m: Medicine): string {
  const duration = m.durationDays && `for ${plural(m.durationDays, "day")}`;
  return [m.dose, frequencyLabel(m.frequency), m.route && formatStatus(m.route), duration].filter(Boolean).join(" · ");
}

// One prescribed medicine: how to take it, and where it is.
export function MedicineCard({ medicine }: { medicine: Medicine }) {
  const doctorName = useDoctorName();
  const pharmacy = usePharmacy(medicine.pharmacyId);
  const { status, label } = MEDICINE_STATUS[medicine.status];
  const waiting = medicine.status === "to_collect" || medicine.status === "on_hold";

  return (
    <li className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{medicine.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{howToTake(medicine) || "Take as your doctor told you"}</p>
        </div>
        <StatusBadge status={status} label={label} className="shrink-0" />
      </div>
      {medicine.note && <p className="text-sm text-foreground">{medicine.note}</p>}
      {medicine.status === "on_hold" && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground">
          The pharmacy is holding this{medicine.holdReason ? `: ${medicine.holdReason}` : "."} Ask them, or your doctor, what happens next.
        </p>
      )}
      {waiting && pharmacy && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Store className="size-4" /> {pharmacy.name.full}</span>
          {pharmacy.phone && (
            <a href={`tel:${pharmacy.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
              <Phone className="size-4" /> {pharmacy.phone}
            </a>
          )}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {[medicine.quantity, doctorName(medicine.doctorId), formatDate(medicine.prescribedAt)].filter(Boolean).join(" · ")}
      </p>
    </li>
  );
}
