"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getOrganizations, updateOrganization } from "@/lib/api/organizations";
import { apiErrorMessage } from "@/lib/api/client";
import { ORGANIZATION_TYPES, ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import type { Organization } from "@/types";
import { OrganizationDialog } from "./OrganizationDialog";

const byName = (a: Organization, b: Organization) => a.name.localeCompare(b.name);

export function OrganizationList() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  // undefined: dialog closed; null: creating; an organization: editing it.
  const [editing, setEditing] = useState<Organization | null | undefined>(undefined);

  useEffect(() => {
    getOrganizations({ includeInactive: true })
      .then(setOrganizations)
      .catch((err) => toast.error(apiErrorMessage(err, "Failed to load organizations")))
      .finally(() => setIsLoading(false));
  }, []);

  const shown = useMemo(
    () => organizations.filter((o) => typeFilter === "all" || o.type === typeFilter),
    [organizations, typeFilter],
  );

  const upsert = (saved: Organization) =>
    setOrganizations((prev) => [...prev.filter((o) => o.id !== saved.id), saved].sort(byName));

  const toggleActive = async (org: Organization) => {
    try {
      const saved = await updateOrganization(org.id, { active: !org.active });
      upsert(saved);
      toast.success(saved.active ? "Organization reactivated" : "Organization deactivated", { description: saved.name });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update organization"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Organizations" description="Clinics, pharmacies and laboratories, and where staff are assigned.">
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setEditing(null)}>
          <Plus className="h-4 w-4 mr-2" /> Add Organization
        </Button>
      </PageHeader>

      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-48 bg-muted border"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {ORGANIZATION_TYPES.map((t) => <SelectItem key={t} value={t}>{ORGANIZATION_TYPE_LABELS[t]}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="bg-white rounded-md border overflow-x-auto shadow-sm">
        {isLoading ? (
          <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline-block mr-2 text-primary" />Loading organizations…</div>
        ) : shown.length === 0 ? (
          <EmptyState icon={Building2} title="No organizations" description="Add a pharmacy before assigning pharmacists to it." actionLabel="Add Organization" onAction={() => setEditing(null)} />
        ) : (
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((o) => (
                <TableRow key={o.id} className={o.active ? "" : "opacity-60"}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell>{ORGANIZATION_TYPE_LABELS[o.type] ?? o.type}</TableCell>
                  <TableCell className="text-muted-foreground">{o.city ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{o.phone ?? "—"}</TableCell>
                  <TableCell>
                    {o.active
                      ? <Badge variant="outline" className="bg-status-success-bg text-status-success-text border-status-success-border">Active</Badge>
                      : <Badge variant="outline" className="bg-status-neutral-bg text-status-neutral-text border-status-neutral-border">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-1 whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(o)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(o)}>{o.active ? "Deactivate" : "Reactivate"}</Button>
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
