"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { nameById } from "@curo/web/format";
import { useServerPagination } from "@curo/web/hooks";
import { EmptyState } from "@curo/web/ui/empty-state";
import { LoadError } from "@curo/web/ui/load-error";
import { Pagination } from "@curo/web/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@curo/web/ui/select";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@curo/web/ui/table";
import { getQCLogsPaginated, type LabInstrument } from "@/lib/api/lab";
import { cn, formatDate } from "@/lib/utils";
import type { LabStaff, QCStatus } from "@/types";

const ALL = "all";
const STATUSES: { value: QCStatus; label: string }[] = [
  { value: "fail", label: "Fail" },
  { value: "warning", label: "Warning" },
  { value: "pass", label: "Pass" },
];

interface QCLogTableProps {
  instruments: LabInstrument[];
  staff: LabStaff[];
}

export function QCLogTable({ instruments, staff }: QCLogTableProps) {
  const [instrument, setInstrument] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const { items: logs, total, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    (page, pageSize) =>
      getQCLogsPaginated({
        page,
        pageSize,
        instrumentId: instrument === ALL ? undefined : instrument,
        status: status === ALL ? undefined : (status as QCStatus),
      }),
    [instrument, status],
  );
  const instrumentName = (id: string) => instruments.find(i => i.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={instrument} onValueChange={setInstrument}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Instrument">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Every instrument</SelectItem>
            {instruments.map(inst => <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Result">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any result</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" /> Loading QC runs…
          </div>
        ) : isError ? (
          <LoadError what="the QC runs" />
        ) : logs.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No QC runs" description={instrument !== ALL || status !== ALL ? "None match these filters." : "Control runs appear here once they're logged."} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Control</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Observed</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Run by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id} className={cn(log.status === "fail" && "bg-status-error-bg/40", log.status === "warning" && "bg-status-warning-bg/40")}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(log.performedAt)}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{instrumentName(log.instrumentId)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.testCode}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.controlLevel}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">{log.expectedValue} {log.unit}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums text-foreground">{log.observedValue} {log.unit}</TableCell>
                    <TableCell><StatusBadge status={log.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{nameById(log.performedBy, staff, "—")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {total > 0 && (
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}
    </div>
  );
}
