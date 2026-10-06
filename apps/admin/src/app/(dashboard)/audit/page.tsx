"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { getAuditLogsPaginated } from "@/lib/api/audit";
import { format, parseISO } from "date-fns";
import type { AuditEntry } from "@/types";

const actionClass: Record<string, string> = {
  CREATE: "bg-status-success-bg text-status-success-text border-status-success-border",
  UPDATE: "bg-status-info-bg text-status-info-text border-status-info-border",
  DELETE: "bg-status-error-bg text-status-error-text border-status-error-border",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [pageSize]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAuditLogsPaginated({ page, pageSize });
      setLogs(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
      setError("Failed to load audit log.");
      setLogs([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader title="Audit log" description="Administrative and billing changes recorded across the system." />

      <Card className="shadow-sm border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2 text-primary" />Loading audit log…</TableCell></TableRow>
              ) : error ? (
                <TableRow><TableCell colSpan={5} className="text-center text-destructive py-10">{error}</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No audit entries yet.</TableCell></TableRow>
              ) : (
                logs.map((l) => (
                  <TableRow key={l.id} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground whitespace-nowrap">{l.createdAt ? format(parseISO(l.createdAt), "dd MMM, HH:mm") : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={actionClass[l.action] ?? ""}>{l.action}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{l.resourceType}</TableCell>
                    <TableCell className="text-muted-foreground">{l.userRole ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{l.outcomeDescription ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
