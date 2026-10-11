"use client";

import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { AccountMenu, AppShell } from "@curo/web/shell";
import { NotificationsMenu } from "@curo/web/notifications";
import { useAuth } from "@curo/web/auth";
import { ROUTES } from "@/lib/constants";
import { myQueries } from "@/lib/queries";
import { NAV } from "./nav";

export function PatientShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  // A patient's sign-in carries no name; their record does.
  const name = useQuery(myQueries.profile()).data?.name.full;

  return (
    <AppShell
      portal="Patient Portal"
      home={ROUTES.HOME}
      nav={NAV}
      account={
        <AccountMenu
          name={name || user?.name || "Patient"}
          email={user?.email}
          links={[{ label: "My details", href: ROUTES.ACCOUNT, icon: UserRound }]}
          onSignOut={logout}
        />
      }
      toolbar={
        <>
          <div className="flex-1" />
          <NotificationsMenu />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
