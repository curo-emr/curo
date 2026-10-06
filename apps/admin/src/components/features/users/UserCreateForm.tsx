"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createUserSchema, type CreateUserInput } from "@/lib/validations/user";
import { createUser } from "@/lib/api/users";
import { ROUTES, USER_ROLES, ROLE_LABELS, GENDERS } from "@/lib/constants";
import { apiErrorMessage } from "@/lib/api/client";

// Patients are created via receptionist registration (which generates the PHN),
// so the admin form only creates staff accounts — avoids orphan patient logins.
const CREATABLE_ROLES = USER_ROLES.filter((r) => r !== "PATIENT");

export function UserCreateForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register, handleSubmit, watch, setValue, formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { gender: "unknown", role: "DOCTOR" },
  });

  const role = watch("role");
  const isStaff = role !== "PATIENT";

  const onSubmit = async (data: CreateUserInput) => {
    setSubmitting(true);
    try {
      const created = await createUser({
        email: data.email,
        password: data.password,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        phone: data.phone || undefined,
        specialization: data.specialization || undefined,
        qualification: data.qualification || undefined,
        licenseNumber: data.licenseNumber || undefined,
      });
      toast.success("User created", { description: `${data.firstName} ${data.lastName} (${ROLE_LABELS[data.role]})` });
      router.push(ROUTES.USER(created.id));
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to create user"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b pb-3"><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setValue("role", v as CreateUserInput["role"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CREATABLE_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="user@curo.health" />
              {errors.email && <p className="text-xs text-status-error-text">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" type="text" {...register("password")} placeholder="At least 8 characters" />
              {errors.password && <p className="text-xs text-status-error-text">{errors.password.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b pb-3"><CardTitle className="text-base">Profile</CardTitle></CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-status-error-text">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-status-error-text">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={watch("gender") ?? "unknown"} onValueChange={(v) => setValue("gender", v as CreateUserInput["gender"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} placeholder="+94..." />
            </div>
          </div>

          {isStaff && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label htmlFor="specialization">Specialization</Label>
                <Input id="specialization" {...register("specialization")} placeholder="e.g. Cardiology" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qualification">Qualification</Label>
                <Input id="qualification" {...register("qualification")} placeholder="e.g. MBBS" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="licenseNumber">License number</Label>
                <Input id="licenseNumber" {...register("licenseNumber")} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push(ROUTES.USERS)}>Cancel</Button>
        <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create user"}
        </Button>
      </div>
    </form>
  );
}
