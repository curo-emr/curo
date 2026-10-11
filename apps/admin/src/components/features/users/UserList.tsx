"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, Users } from "lucide-react";
import { useDebouncedValue, useServerPagination } from "@curo/web/hooks";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import { EmptyState } from "@curo/web/ui/empty-state";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { LoadError } from "@curo/web/ui/load-error";
import { Pagination } from "@curo/web/ui/pagination";
import { SearchInput } from "@curo/web/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@curo/web/ui/select";
import { toneClass } from "@curo/web/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@curo/web/ui/table";
import { ActiveBadge } from "@/components/ui/ActiveBadge";
import { getUsersPaginated } from "@/lib/api/users";
import { ROLE_LABELS, ROLE_TONE, ROUTES, USER_ROLES, type UserRole } from "@/lib/constants";
import { ResetPasswordDialog } from "./ResetPasswordDialog";

export function UserList() {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const search = useDebouncedValue(query);

  const { items: users, total, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    (page, pageSize) =>
      getUsersPaginated({
        page,
        pageSize,
        search: search || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
      }),
    [search, roleFilter],
  );
  const filtered = !!search || roleFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email or role…" className="sm:max-w-md sm:flex-1" />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="sm:w-48" aria-label="Role"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {USER_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" /> Loading users…
          </div>
        ) : isError ? (
          <LoadError what="users" />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={filtered ? "No users match" : "No users yet"}
            description={filtered ? "Check the spelling, or try another role." : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link href={ROUTES.USER(u.id)} className="group flex items-center gap-3">
                        <InitialsAvatar name={u.name} size="sm" />
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground group-hover:text-primary">{u.name}</span>
                          <span className="block text-xs text-muted-foreground">{u.email}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={toneClass(ROLE_TONE[u.role as UserRole] ?? "neutral")}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                      {u.specialization && <p className="mt-1 text-xs text-muted-foreground">{u.specialization}</p>}
                    </TableCell>
                    <TableCell><ActiveBadge active={u.isActive} /></TableCell>
                    <TableCell className="text-right">
                      <ResetPasswordDialog
                        user={u}
                        trigger={
                          <Button variant="ghost" size="sm" aria-label={`Reset ${u.name}'s password`}>
                            <KeyRound /> <span className="hidden md:inline">Reset password</span>
                          </Button>
                        }
                      />
                    </TableCell>
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
