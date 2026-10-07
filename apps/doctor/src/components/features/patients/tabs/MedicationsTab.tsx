"use client";

import { useMemo, useState } from "react";
import { Pill, Printer } from "lucide-react";
import type { Patient, Prescription } from "@/types";
import { Button } from "@curo/web/ui/button";
import { Checkbox } from "@curo/web/ui/checkbox";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RX_PRINT_ID, RxPrint, rxDirections } from "@/components/features/prescriptions/RxPrint";
import { useAuth } from "@/contexts/AuthContext";
import { printOnly } from "@/lib/print";
import { formatDate } from "@/lib/utils";

export function MedicationsTab({ prescriptions, patient }: { prescriptions: Prescription[]; patient: Patient }) {
  const { user } = useAuth();
  // Every prescribed item, newest first, individually selectable for printing.
  const rows = useMemo(
    () => [...prescriptions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .flatMap(rx => rx.items.map((item, i) => ({ rx, item, key: `${rx.id}:${item.id}:${i}` }))),
    [prescriptions],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const printRows = selected.size > 0 ? rows.filter(r => selected.has(r.key)) : rows;

  return (
    <>
      <SectionCard icon={Pill} iconClassName="text-clinical-rx" title="Prescriptions" count={rows.length} noPadding className="no-print"
        headerRight={rows.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => printOnly(RX_PRINT_ID)}>
            <Printer /> {selected.size > 0 ? `Print ${selected.size} selected` : "Print all"}
          </Button>
        )}>
        {rows.length === 0 ? (
          <EmptyState icon={Pill} title="No prescriptions yet" description="Medications you prescribe during a visit appear here." />
        ) : (
          <ul className="divide-y">
            {rows.map(({ rx, item, key }) => (
              <li key={key} className="flex items-start gap-3 px-5 py-3">
                <Checkbox className="mt-0.5" checked={selected.has(key)} onCheckedChange={() => toggle(key)} aria-label={`Select ${item.displayName} for printing`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.displayName}</p>
                  <p className="text-xs text-muted-foreground">{rxDirections(item)} · Qty {item.quantity}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={rx.status} />
                  <span className="text-xs text-muted-foreground">{formatDate(rx.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <RxPrint patient={patient} items={printRows.map(r => r.item)} prescriber={user?.name} />
    </>
  );
}
