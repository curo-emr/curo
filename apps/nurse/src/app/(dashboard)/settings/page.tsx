"use client";

import { PageHeader } from "@curo/web/ui/page-header";
import { AccountProfile } from "@curo/web/shell";
import { useAuth } from "@curo/web/auth";
import { useCurrentPractitioner } from "@/lib/hooks/useCurrentPractitioner";

const ROLE_LABELS: Record<string, string> = { NURSE: "Nursing Officer", SUPER_ADMIN: "Super Admin" };

export default function AccountPage() {
  const { user, logout } = useAuth();
  // The nurse's own practitioner record; the session's name and email fill in until it loads, or if it can't.
  const me = useCurrentPractitioner();

  const fields = [
    { label: "Full name", value: me?.name.full ?? user?.name },
    { label: "Role", value: ROLE_LABELS[user?.role ?? ""] ?? user?.role },
    { label: "Qualifications", value: me?.qualification },
    { label: "Email", value: user?.email },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Account" description="Your profile at the nurse station." />
      <AccountProfile name={me?.name.full ?? user?.name ?? ""} fields={fields} onSignOut={logout} />
    </div>
  );
}
