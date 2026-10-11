"use client";

import Link from "next/link";
import { PageHeader } from "@curo/web/ui/page-header";
import { AccountProfile } from "@curo/web/shell";
import { useAuth } from "@curo/web/auth";
import { ROUTES } from "@/lib/constants";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const name = user?.name || "Administrator";

  const fields = [
    { label: "Full name", value: user?.name },
    { label: "Role", value: "Super admin" },
    { label: "Email", value: user?.email },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Account" description="Your administrator account." />
      <AccountProfile
        name={name}
        fields={fields}
        help={
          user && (
            <>
              To change your password, use Reset password on{" "}
              <Link href={ROUTES.USER(user.id)} className="font-medium text-foreground underline underline-offset-2">
                your own user page
              </Link>
              .
            </>
          )
        }
        onSignOut={logout}
      />
    </div>
  );
}
