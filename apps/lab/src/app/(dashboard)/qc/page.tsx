"use client";

import { useQuery } from "@tanstack/react-query";
import { Cpu } from "lucide-react";
import { QueryContent } from "@curo/web/query";
import { Card } from "@curo/web/ui/card";
import { PageHeader } from "@curo/web/ui/page-header";
import { StatusBadge, type Status } from "@curo/web/ui/status-badge";
import { QCLogTable } from "@/components/features/qc/QCLogTable";
import type { LabInstrument } from "@/lib/api/lab";
import { labQueries } from "@/lib/queries";
import type { LabStaff } from "@/types";

const NO_INSTRUMENTS: LabInstrument[] = [];
const NO_STAFF: LabStaff[] = [];

export default function QCPage() {
  // Instruments feed the status cards and the table's filter; staff name who ran each control.
  // The QC log table fetches its own pages.
  const instruments = useQuery(labQueries.instruments());
  const staff = useQuery(labQueries.staff()).data ?? NO_STAFF;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Quality control" description="Control runs on your lab's instruments, newest first." />

      <QueryContent query={instruments} what="the instruments">
        {list => list.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(inst => (
              <Card key={inst.id} className="flex-row items-center gap-3 p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Cpu className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{inst.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{[inst.model, inst.location].filter(Boolean).join(" · ")}</p>
                </div>
                <StatusBadge status={inst.status as Status} className="shrink-0" />
              </Card>
            ))}
          </div>
        )}
      </QueryContent>

      <QCLogTable instruments={instruments.data ?? NO_INSTRUMENTS} staff={staff} />
    </div>
  );
}
