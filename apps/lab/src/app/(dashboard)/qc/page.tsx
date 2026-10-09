"use client";

import { useQuery } from "@tanstack/react-query";
import { Cpu } from "lucide-react";
import { QueryContent } from "@curo/web/query";
import { QCLogTable } from "@/components/features/qc/QCLogTable";
import { Badge } from "@curo/web/ui/badge";
import { Card, CardContent } from "@curo/web/ui/card";
import { labQueries } from "@/lib/queries";
import type { LabInstrument } from "@/lib/api/lab";
import type { LabStaff } from "@/types";

const NO_INSTRUMENTS: LabInstrument[] = [];
const NO_STAFF: LabStaff[] = [];

export default function QCPage() {
  // Instruments feed the status cards + the table's filter dropdown; staff feeds the
  // "performed by" lookup. The QC log table fetches its own paginated records.
  const instruments = useQuery(labQueries.instruments());
  const staff = useQuery(labQueries.staff()).data ?? NO_STAFF;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quality Control</h1>
        <p className="text-sm text-muted-foreground">Monitor QC results and instrument performance</p>
      </div>

      <QueryContent query={instruments} what="the instruments">
        {list => (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {list.map(inst => (
              <Card key={inst.id} className="shadow-sm border-slate-200">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-700 truncate">{inst.name}</span>
                  </div>
                  <Badge variant="outline" className={
                    inst.status === 'operational' ? 'text-green-700 border-green-200 bg-green-50' :
                    inst.status === 'maintenance' ? 'text-amber-700 border-amber-200 bg-amber-50' :
                    'text-red-700 border-red-200 bg-red-50'
                  }>
                    {inst.status.charAt(0).toUpperCase() + inst.status.slice(1)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryContent>

      <QCLogTable instruments={instruments.data ?? NO_INSTRUMENTS} staff={staff} />
    </div>
  );
}
