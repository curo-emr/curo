"use client";

import { useQuery } from "@tanstack/react-query";
import { Info, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@curo/web/ui/button";
import { Skeleton } from "@curo/web/ui/skeleton";
import { PageHeader } from "@curo/web/ui/page-header";
import { PatientAvatar } from "@/components/ui/PatientAvatar";
import { SectionCard } from "@curo/web/ui/section-card";
import { practitionerQueries } from "@/lib/queries";

export default function AccountPage() {
  const { user, logout } = useAuth();
  // The doctor's own practitioner record; the session's name and email fill in until it loads, or if it can't.
  const doctors = useQuery({ ...practitionerQueries.byRole("DOCTOR"), enabled: !!user?.practitionerId });
  const me = doctors.data?.find(p => p.id === user?.practitionerId);
  const loading = doctors.isPending && !!user?.practitionerId;

  const fields = [
    { label: "Full name", value: me ? `Dr. ${me.name.full}` : user?.name },
    { label: "Specialty", value: me?.specialty },
    { label: "Qualifications", value: me?.qualification },
    { label: "SLMC licence", value: me?.licenseNumber },
    { label: "Email", value: me?.email ?? user?.email },
    { label: "Phone", value: me?.phone },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Account" description="Your profile as it appears on prescriptions and visit records." />

      <SectionCard icon={UserRound} title="Profile">
        <div className="flex flex-col gap-6 sm:flex-row">
          <PatientAvatar name={me?.name.full ?? user?.name ?? ""} size="xl" />
          <dl className="grid flex-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {fields.map(f => (
              <div key={f.label}>
                <dt className="text-xs font-medium text-muted-foreground">{f.label}</dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  {loading && !f.value ? <Skeleton className="h-5 w-32" /> : f.value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-6 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Profile details and passwords are managed by your clinic administrator. Contact them to make changes.
        </p>
      </SectionCard>

      <div className="flex justify-end">
        <Button variant="outline" onClick={logout} className="text-destructive hover:text-destructive">
          <LogOut /> Sign out
        </Button>
      </div>
    </div>
  );
}
