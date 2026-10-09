"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@curo/web/ui/page-header";
import { AccountProfile } from "@curo/web/shell";
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
      <AccountProfile name={me?.name.full ?? user?.name ?? ""} fields={fields} loading={loading} onSignOut={logout} />
    </div>
  );
}
