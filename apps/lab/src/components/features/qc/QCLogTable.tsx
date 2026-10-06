"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Loader2 } from "lucide-react";
import { QCLog, LabInstrument, LabStaff, QCStatus } from "@/types";
import { formatDate, getStaffName } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getQCLogsPaginated } from "@/lib/api/lab";

interface QCLogTableProps {
  instruments: LabInstrument[];
  staff: LabStaff[];
}

export function QCLogTable({ instruments, staff }: QCLogTableProps) {
  const [instrumentFilter, setInstrumentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [logs, setLogs] = useState<QCLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [instrumentFilter, statusFilter, pageSize]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getQCLogsPaginated({
        page,
        pageSize,
        instrumentId: instrumentFilter === "all" ? undefined : instrumentFilter,
        status: statusFilter === "all" ? undefined : (statusFilter as QCStatus),
      });
      setLogs(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
      setError("Failed to load QC records.");
      setLogs([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, instrumentFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const getInstrumentName = (id: string) => instruments.find(i => i.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <Select value={instrumentFilter} onValueChange={setInstrumentFilter}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="Instrument" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Instruments</SelectItem>
              {instruments.map(inst => (
                <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">{total} records</span>
        </CardContent>
      </Card>

      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Test</TableHead>
              <TableHead>Control</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Observed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Performed By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2 text-primary" />
                  Loading QC records…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-destructive">{error}</TableCell>
              </TableRow>
            ) : logs.length > 0 ? (
              logs.map(log => {
                const rowClass = log.status === 'fail' ? 'bg-status-error-bg/50' : log.status === 'warning' ? 'bg-status-warning-bg/50' : '';
                return (
                  <TableRow key={log.id} className={`${rowClass} hover:bg-muted/50 transition-colors`}>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(log.performedAt)}</TableCell>
                    <TableCell className="text-sm text-foreground font-medium">{getInstrumentName(log.instrumentId)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.testCode}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.controlLevel}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{log.expectedValue} {log.unit}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">{log.observedValue} {log.unit}</TableCell>
                    <TableCell><StatusBadge status={log.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getStaffName(log.performedBy, staff)}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No QC records match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
