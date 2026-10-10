"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@curo/web/ui/page-header";
import { AccountProfile } from "@curo/web/shell";
import { useAuth } from "@curo/web/auth";
import { workplaceQueries } from "@curo/web/workplace";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const workplace = useQuery(workplaceQueries.mine());

  const fields = [
    { label: "Full name", value: user?.name },
    { label: "Role", value: "Pharmacist" },
    { label: "Email", value: user?.email },
    { label: "Pharmacy", value: workplace.data === null ? "Not assigned to a pharmacy" : workplace.data?.name },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Account" description="Your profile at the pharmacy." />
      <AccountProfile name={user?.name ?? ""} fields={fields} loading={workplace.isPending} onSignOut={logout} />
    </div>
  );
}
