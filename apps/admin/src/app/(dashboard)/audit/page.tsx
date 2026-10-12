"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Loader2, ScrollText } from "lucide-react";
import { useServerPagination } from "@curo/web/hooks";
import { EmptyState } from "@curo/web/ui/empty-state";
import { LoadError } from "@curo/web/ui/load-error";
import { PageHeader } from "@curo/web/ui/page-header";
import { Pagination } from "@curo/web/ui/pagination";
import { cn } from "@curo/web/ui/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@curo/web/ui/table";
import { getAuditLogsPaginated } from "@/lib/api/audit";
import { auditUserIds, describeAuditEntry } from "@/lib/audit";
import { ROLE_LABELS, ROUTES } from "@/lib/constants";
import { userQueries } from "@/lib/queries";
import type { AdminUser } from "@/types";

export default function AuditPage() {
  const { items: entries, total, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    (page, pageSize) => getAuditLogsPaginated({ page, pageSize }),
  );

  // The names behind the page's user ids; each user is looked up once and cached.
  const ids = [...new Set(entries.flatMap(auditUserIds))];
  const users = useQueries({
    queries: ids.map(id => userQueries.detail(id)),
    combine: results => new Map(results.flatMap(r => (r.data ? [[r.data.id, r.data] as const] : []))),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Audit log" description="Who created, changed or opened which records, newest first." />

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" /> Loading the audit log…
          </div>
        ) : isError ? (
          <LoadError what="the audit log" />
        ) : entries.length === 0 ? (
          <EmptyState icon={ScrollText} title="Nothing recorded yet" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>What</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {e.createdAt ? format(parseISO(e.createdAt), "d MMM, HH:mm") : "—"}
                    </TableCell>
                    <TableCell>
                      <UserLink user={users.get(e.userId)} />
                      <p className="text-xs text-muted-foreground">{e.userRole ? ROLE_LABELS[e.userRole] ?? e.userRole : "—"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="whitespace-nowrap text-foreground">{describeAuditEntry(e)}</p>
                      {e.resourceType === "User" && <UserLink user={users.get(e.resourceId)} className="text-xs" />}
                    </TableCell>
                    <TableCell className="min-w-64 whitespace-normal text-muted-foreground">{e.outcomeDescription ?? "—"}</TableCell>
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

/** A user's name, linking to their page; blank while it loads, or for an account no longer there. */
function UserLink({ user, className }: { user?: AdminUser; className?: string }) {
  if (!user) return null;
  return (
    <Link href={ROUTES.USER(user.id)} className={cn("block font-medium text-foreground hover:text-primary hover:underline", className)}>
      {user.name}
    </Link>
  );
}
