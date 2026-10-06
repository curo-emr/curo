"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Search, Loader2 } from "lucide-react";
import { ROUTES, ROLE_LABELS, USER_ROLES } from "@/lib/constants";
import type { AdminUser } from "@/types";
import { getUsersPaginated } from "@/lib/api/users";

const roleBadgeClass: Record<string, string> = {
  DOCTOR: "bg-status-info-bg text-status-info-text border-status-info-border",
  RECEPTIONIST: "bg-status-teal-bg text-status-teal-text border-status-teal-border",
  PHARMACIST: "bg-status-purple-bg text-status-purple-text border-status-purple-border",
  LAB_STAFF: "bg-status-warning-bg text-status-warning-text border-status-warning-border",
  NURSE: "bg-status-success-bg text-status-success-text border-status-success-border",
  PATIENT: "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border",
  SUPER_ADMIN: "bg-status-error-bg text-status-error-text border-status-error-border",
};

export function UserList({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, roleFilter, pageSize]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getUsersPaginated({
        page,
        pageSize,
        search: debouncedQuery || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
      });
      setUsers(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error(err);
      setError("Failed to load users.");
      setUsers([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedQuery, roleFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-muted border"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48 bg-muted border"><SelectValue placeholder="All roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {USER_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2 text-primary" />Loading users…</TableCell></TableRow>
            ) : error ? (
              <TableRow><TableCell colSpan={4} className="text-center text-destructive py-10">{error}</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">No users found.</TableCell></TableRow>
            ) : (
              users.map((u) => (
                <TableRow
                  key={u.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(ROUTES.USER(u.id))}
                >
                  <TableCell>
                    <Link href={ROUTES.USER(u.id)} className="font-medium text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                      {u.name}
                    </Link>
                    {u.specialization && <p className="text-xs text-muted-foreground">{u.specialization}</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={roleBadgeClass[u.role] ?? ""}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge variant="outline" className="bg-status-success-bg text-status-success-text border-status-success-border">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-status-neutral-bg text-status-neutral-text border-status-neutral-border">Suspended</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
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
