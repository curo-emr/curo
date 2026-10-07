"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createOrganization, updateOrganization, type OrganizationInput } from "@/lib/api/organizations";
import { apiErrorMessage } from "@curo/web/api";
import { ORGANIZATION_TYPES, ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { organizationSchema, type OrganizationFormInput } from "@/lib/validations/organization";
import type { Organization } from "@/types";

interface OrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The organization to edit; omitted to create one. */
  organization?: Organization;
  onSaved: (saved: Organization) => void;
}

const TEXT_FIELDS = [
  { name: "city", label: "City" },
  { name: "phone", label: "Phone", placeholder: "+94..." },
  { name: "addressLine1", label: "Address", wide: true },
  { name: "email", label: "Email" },
  { name: "licenseNumber", label: "License number" },
] as const;

function formValues(org?: Organization): OrganizationFormInput {
  return {
    name: org?.name ?? "",
    type: org?.type ?? "pharmacy",
    city: org?.city ?? "",
    addressLine1: org?.addressLine1 ?? "",
    phone: org?.phone ?? "",
    email: org?.email ?? "",
    licenseNumber: org?.licenseNumber ?? "",
  };
}

// A blank optional field is saved as null, which also clears it on an edit.
function toInput({ type, name, ...optional }: OrganizationFormInput): OrganizationInput {
  const fields = Object.fromEntries(Object.entries(optional).map(([k, v]) => [k, v || null]));
  return { type, name, ...fields };
}

export function OrganizationDialog({ open, onOpenChange, organization, onSaved }: OrganizationDialogProps) {
  const isEdit = !!organization;
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = useForm<OrganizationFormInput>({
    resolver: zodResolver(organizationSchema),
    defaultValues: formValues(organization),
  });
  const type = useWatch({ control, name: "type" });

  useEffect(() => {
    if (open) reset(formValues(organization));
  }, [open, organization, reset]);

  const onSubmit = async (data: OrganizationFormInput) => {
    setSaving(true);
    try {
      const { type, ...changes } = toInput(data);
      const saved = organization
        ? await updateOrganization(organization.id, changes)
        : await createOrganization({ type, ...changes });
      toast.success(isEdit ? "Organization updated" : "Organization created", { description: saved.name });
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save organization"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit organization" : "New organization"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "The type can't change once created: staff and stock belong to it."
                : "Pharmacists are assigned to a pharmacy, lab staff to a laboratory."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="org-name">Name</Label>
              <Input id="org-name" {...register("name")} placeholder="e.g. Curo Pharmacy — Galle" autoFocus />
              {errors.name && <p className="text-xs text-status-error-text">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setValue("type", v as OrganizationFormInput["type"])} disabled={isEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_TYPES.map((t) => <SelectItem key={t} value={t}>{ORGANIZATION_TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {TEXT_FIELDS.map((f) => (
              <div key={f.name} className={`space-y-1.5 ${"wide" in f ? "sm:col-span-2" : ""}`}>
                <Label htmlFor={`org-${f.name}`}>{f.label}</Label>
                <Input id={`org-${f.name}`} {...register(f.name)} placeholder={"placeholder" in f ? f.placeholder : undefined} />
                {errors[f.name] && <p className="text-xs text-status-error-text">{errors[f.name]?.message}</p>}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
