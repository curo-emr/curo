"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadError } from "@curo/web/ui/load-error";
import { toast } from "sonner";
import { Building2, Loader2, Plus } from "lucide-react";
import { Button } from "@curo/web/ui/button";
import { ConfirmAction } from "@curo/web/ui/confirm-action";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@curo/web/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@curo/web/ui/table";
import { updateOrganization } from "@/lib/api/organizations";
import { organizationQueries } from "@/lib/queries";
import { apiErrorMessage } from "@curo/web/api";
import { ORGANIZATION_TYPES, ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import type { Organization } from "@/types";
import { ActiveBadge } from "@/components/ui/ActiveBadge";
import { OrganizationDialog } from "./OrganizationDialog";

const byName = (a: Organization, b: Organization) => a.name.localeCompare(b.name);

export function OrganizationList() {
  const queryClient = useQueryClient();
  const list = useQuery(organizationQueries.list(true));
  const [typeFilter, setTypeFilter] = useState("all");
  // undefined: dialog closed; null: creating; an organization: editing it.
  const [editing, setEditing] = useState<Organization | null | undefined>(undefined);

  const shown = useMemo(
    () => (list.data ?? []).filter((o) => typeFilter === "all" || o.type === typeFilter),
    [list.data, typeFilter],
  );

  // Shown at once here; every organization list (such as the workplace pickers) then reloads.
  const upsert = (saved: Organization) => {
    queryClient.setQueryData(organizationQueries.list(true).queryKey, (prev) =>
      [...(prev ?? []).filter((o) => o.id !== saved.id), saved].sort(byName));
    void queryClient.invalidateQueries({ queryKey: organizationQueries.all });
  };

  const setActive = async (org: Organization, active: boolean) => {
    try {
      const saved = await updateOrganization(org.id, { active });
      upsert(saved);
      toast.success(saved.active ? "Organization reactivated" : "Organization deactivated", { description: saved.name });
    } catch (err) {
      toast.error(apiErrorMessage(err, "The organization couldn't be changed"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Organizations" description="The clinics, pharmacies and laboratories staff work at.">
        <Button onClick={() => setEditing(null)}>
          <Plus /> Add organization
        </Button>
      </PageHeader>

      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="sm:w-48" aria-label="Type"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {ORGANIZATION_TYPES.map((t) => <SelectItem key={t} value={t}>{ORGANIZATION_TYPE_LABELS[t]}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        {!list.data && list.isError ? (
          <LoadError what="organizations" onRetry={() => void list.refetch()} retrying={list.isFetching} />
        ) : !list.data ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" /> Loading organizations…
          </div>
        ) : shown.length === 0 ? (
          <EmptyState icon={Building2} title="No organizations" description="Add a pharmacy before assigning pharmacists to it." action={<Button variant="outline" size="sm" onClick={() => setEditing(null)}>Add organization</Button>} />
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((o) => (
                <TableRow key={o.id} className={o.active ? "" : "opacity-60"}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell>{ORGANIZATION_TYPE_LABELS[o.type] ?? o.type}</TableCell>
                  <TableCell className="text-muted-foreground">{o.city ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{o.phone ?? "—"}</TableCell>
                  <TableCell><ActiveBadge active={o.active} inactiveLabel="Inactive" /></TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(o)}>Edit</Button>
                    {o.active ? (
                      <ConfirmAction
                        trigger={<Button variant="ghost" size="sm">Deactivate</Button>}
                        title={`Deactivate ${o.name}?`}
                        description="It's no longer offered when choosing a workplace, a pharmacy or a lab. Staff who work there now aren't moved. You can reactivate it at any time."
                        confirmLabel="Deactivate"
                        destructive
                        onConfirm={() => setActive(o, false)}
                      />
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setActive(o, true)}>Reactivate</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <OrganizationDialog
        open={editing !== undefined}
        onOpenChange={(open) => { if (!open) setEditing(undefined); }}
        organization={editing ?? undefined}
        onSaved={upsert}
      />
    </div>
  );
}
