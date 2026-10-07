"use client";

import { useServerPagination } from "@curo/web/hooks";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@curo/web/ui/table";
import { Pagination } from "@curo/web/ui/pagination";
import { getAuditLogsPaginated } from "@/lib/api/audit";
import { format, parseISO } from "date-fns";

const actionClass: Record<string, string> = {
  CREATE: "bg-status-success-bg text-status-success-text border-status-success-border",
  UPDATE: "bg-status-info-bg text-status-info-text border-status-info-border",
  DELETE: "bg-status-error-bg text-status-error-text border-status-error-border",
};

export default function AuditPage() {
  const { items: logs, total, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    (page, pageSize) => getAuditLogsPaginated({ page, pageSize }),
  );

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
              ) : isError ? (
                <TableRow><TableCell colSpan={5} className="text-center text-destructive py-10">Failed to load audit log.</TableCell></TableRow>
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
