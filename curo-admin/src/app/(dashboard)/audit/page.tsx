"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getAuditLogs } from "@/lib/api/audit";
import { format, parseISO } from "date-fns";
import type { AuditEntry } from "@/types";

const actionClass: Record<string, string> = {
  CREATE: "bg-status-success-bg text-status-success-text border-status-success-border",
  UPDATE: "bg-status-info-bg text-status-info-text border-status-info-border",
  DELETE: "bg-status-error-bg text-status-error-text border-status-error-border",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAuditLogs().then(setLogs).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader title="Audit log" description="Administrative and billing changes recorded across the system." />

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : (
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
                {logs.length === 0 ? (
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
      )}
    </div>
  );
}
