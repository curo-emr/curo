"use client";

import { useState, useEffect } from "react";
import { Loader2, Cpu } from "lucide-react";
import { QCLogTable } from "@/components/features/qc/QCLogTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getLabInstruments, getLabStaff, getQCLogs, type LabInstrument } from "@/lib/api/lab";
import type { LabStaff, QCLog } from "@/types";

export default function QCPage() {
  const [instruments, setInstruments] = useState<LabInstrument[]>([]);
  const [logs, setLogs] = useState<QCLog[]>([]);
  const [staff, setStaff] = useState<LabStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLabInstruments(), getQCLogs(), getLabStaff()])
      .then(([insts, qcLogs, labStaff]) => {
        setInstruments(insts);
        setLogs(qcLogs);
        setStaff(labStaff);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quality Control</h1>
        <p className="text-sm text-muted-foreground">Monitor QC results and instrument performance</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {instruments.map(inst => (
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

      <QCLogTable logs={logs} instruments={instruments} staff={staff} />
    </div>
  );
}
