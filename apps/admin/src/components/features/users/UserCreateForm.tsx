"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { BriefcaseMedical, KeyRound, Loader2, UserRound } from "lucide-react";
import { apiErrorMessage } from "@curo/web/api";
import { formatStatus } from "@curo/web/format";
import { Button } from "@curo/web/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@curo/web/ui/field";
import { Input } from "@curo/web/ui/input";
import { SectionCard } from "@curo/web/ui/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@curo/web/ui/select";
import { WorkplaceSelect } from "@/components/features/organizations/WorkplaceSelect";
import { createUser } from "@/lib/api/users";
import { GENDERS, PROFESSIONAL_ROLES, ROLE_LABELS, ROUTES, USER_ROLES, WORKPLACE_TYPES } from "@/lib/constants";
import { createUserSchema, type CreateUserInput } from "@/lib/validations/user";
import { PasswordInput } from "./PasswordInput";

// Patients are registered by reception, which gives them their PHN, so only staff are created here.
const CREATABLE_ROLES = USER_ROLES.filter(r => r !== "PATIENT");

export function UserCreateForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { gender: "unknown", role: "DOCTOR" },
  });
  const [role, gender, organizationId] = useWatch({ control, name: ["role", "gender", "organizationId"] });
  const isDoctor = role === "DOCTOR";
  const isProfessional = PROFESSIONAL_ROLES.includes(role);
  const hasWorkplace = !!WORKPLACE_TYPES[role];

  const onSubmit = async (data: CreateUserInput) => {
    setSubmitting(true);
    try {
      // Fields that don't apply to the role chosen last are left out, even if filled in before.
      const created = await createUser({
        email: data.email,
        password: data.password,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        phone: data.phone || undefined,
        specialization: (isDoctor && data.specialization) || undefined,
        qualification: (isProfessional && data.qualification) || undefined,
        licenseNumber: (isProfessional && data.licenseNumber) || undefined,
        organizationId: data.organizationId || undefined,
      });
      toast.success("User created", { description: `${data.firstName} ${data.lastName}, ${ROLE_LABELS[data.role]}` });
      router.push(ROUTES.USER(created.id));
    } catch (err) {
      toast.error(apiErrorMessage(err, "The user couldn't be created"));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <SectionCard icon={KeyRound} iconClassName="text-primary" title="Sign-in">
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="role">Role</FieldLabel>
            <Select
              value={role}
              onValueChange={v => {
                setValue("role", v as CreateUserInput["role"]);
                setValue("organizationId", undefined);
              }}
            >
              <SelectTrigger id="role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CREATABLE_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" type="email" {...register("email")} placeholder="name@curo.test" />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput id="password" {...register("password")} onGenerate={p => setValue("password", p, { shouldValidate: true })} />
            <FieldDescription>Give it to them yourself: nothing is emailed.</FieldDescription>
            {errors.password && <FieldError>{errors.password.message}</FieldError>}
          </Field>
        </FieldGroup>
      </SectionCard>

      <SectionCard icon={UserRound} iconClassName="text-primary" title="Profile">
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="firstName">First name</FieldLabel>
            <Input id="firstName" {...register("firstName")} />
            {errors.firstName && <FieldError>{errors.firstName.message}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="lastName">Last name</FieldLabel>
            <Input id="lastName" {...register("lastName")} />
            {errors.lastName && <FieldError>{errors.lastName.message}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="gender">Gender</FieldLabel>
            <Select value={gender ?? "unknown"} onValueChange={v => setValue("gender", v as CreateUserInput["gender"])}>
              <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GENDERS.map(g => <SelectItem key={g} value={g}>{g === "unknown" ? "Not given" : formatStatus(g)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">Phone <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
            <Input id="phone" {...register("phone")} placeholder="+94…" />
          </Field>
        </FieldGroup>
      </SectionCard>

      {(isProfessional || hasWorkplace) && (
        <SectionCard icon={BriefcaseMedical} iconClassName="text-primary" title="Work">
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            {hasWorkplace && (
              <WorkplaceSelect
                role={role}
                value={organizationId}
                onChange={id => setValue("organizationId", id, { shouldValidate: true })}
                error={errors.organizationId?.message}
              />
            )}
            {isDoctor && (
              <Field>
                <FieldLabel htmlFor="specialization">Specialization</FieldLabel>
                <Input id="specialization" {...register("specialization")} placeholder="e.g. Cardiology" />
              </Field>
            )}
            {isProfessional && (
              <>
                <Field>
                  <FieldLabel htmlFor="qualification">Qualification</FieldLabel>
                  <Input id="qualification" {...register("qualification")} placeholder="e.g. MBBS" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="licenseNumber">License number</FieldLabel>
                  <Input id="licenseNumber" {...register("licenseNumber")} />
                </Field>
              </>
            )}
          </FieldGroup>
        </SectionCard>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push(ROUTES.USERS)}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          Create user
        </Button>
      </div>
    </form>
  );
}
