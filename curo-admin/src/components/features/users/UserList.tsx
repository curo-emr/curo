"use client";

import { useMemo, useState } from "react";
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
import { Search } from "lucide-react";
import { ROUTES, ROLE_LABELS, USER_ROLES } from "@/lib/constants";
import type { AdminUser } from "@/types";

const roleBadgeClass: Record<string, string> = {
  DOCTOR: "bg-status-info-bg text-status-info-text border-status-info-border",
  RECEPTIONIST: "bg-status-teal-bg text-status-teal-text border-status-teal-border",
  PHARMACIST: "bg-status-purple-bg text-status-purple-text border-status-purple-border",
  LAB_STAFF: "bg-status-warning-bg text-status-warning-text border-status-warning-border",
  PATIENT: "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border",
  SUPER_ADMIN: "bg-status-error-bg text-status-error-text border-status-error-border",
};

export function UserList({ users, initialQuery = "" }: { users: AdminUser[]; initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return users.filter((u) => {
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [users, query, roleFilter]);

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

      <p className="text-sm text-muted-foreground px-1">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>

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
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">No users found.</TableCell></TableRow>
            ) : (
              filtered.map((u) => (
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
    </div>
  );
}
