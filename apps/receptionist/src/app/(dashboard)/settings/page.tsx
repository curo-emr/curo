"use client";

import { PageHeader } from "@curo/web/ui/page-header";
import { AccountProfile } from "@curo/web/shell";
import { useAuth } from "@curo/web/auth";

const ROLE_LABELS: Record<string, string> = { RECEPTIONIST: "Receptionist", SUPER_ADMIN: "Super Admin" };

export default function AccountPage() {
  const { user, logout } = useAuth();

  const fields = [
    { label: "Full name", value: user?.name },
    { label: "Role", value: ROLE_LABELS[user?.role ?? ""] ?? user?.role },
    { label: "Email", value: user?.email },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Account" description="Your profile at the front desk." />
      <AccountProfile name={user?.name ?? ""} fields={fields} onSignOut={logout} />
    </div>
  );
}
