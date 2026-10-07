"use client";

import { useEffect, useState } from "react";
import { Label } from "@curo/web/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@curo/web/ui/select";
import { getOrganizations } from "@/lib/api/organizations";
import { ORGANIZATION_TYPE_LABELS, WORKPLACE_REQUIRED, WORKPLACE_TYPES, type UserRole } from "@/lib/constants";
import type { Organization } from "@/types";

interface WorkplaceSelectProps {
  role: UserRole;
  value?: string | null;
  onChange: (organizationId: string) => void;
  disabled?: boolean;
  error?: string;
}

/** Picks the organization a staff member works at, from the kinds their role works at. */
export function WorkplaceSelect({ role, value, onChange, disabled, error }: WorkplaceSelectProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const types = WORKPLACE_TYPES[role] ?? [];

  useEffect(() => {
    getOrganizations().then(setOrganizations).catch(console.error);
  }, []);

  if (!types.length) return null;
  const options = organizations.filter((o) => types.includes(o.type));
  const kinds = types.map((t) => ORGANIZATION_TYPE_LABELS[t].toLowerCase()).join(" or ");

  return (
    <div className="space-y-1.5">
      <Label>
        Workplace {WORKPLACE_REQUIRED.includes(role) ? "" : <span className="text-muted-foreground font-normal">(optional)</span>}
      </Label>
      <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger><SelectValue placeholder={options.length ? `Choose a ${kinds}` : `No active ${kinds} yet`} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.name}{o.city ? ` · ${o.city}` : ""}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-status-error-text">{error}</p>}
    </div>
  );
}
