"use client";

import { Suspense } from "react";
import { Settings } from "lucide-react";
import { AccountMenu, AppShell } from "@curo/web/shell";
import { NotificationsMenu } from "@curo/web/notifications";
import { useAuth } from "@curo/web/auth";
import { ROUTES } from "@/lib/constants";
import { NAV } from "./nav";
import { QueueSearch } from "./QueueSearch";

export function NurseShell({ children, sidebarOpen }: { children: React.ReactNode; sidebarOpen: boolean }) {
  const { user, logout } = useAuth();

  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      portal="Nurse Station"
      home={ROUTES.DASHBOARD}
      nav={NAV}
      account={
        <AccountMenu
          name={user?.name || "Nursing Officer"}
          detail="Nursing Officer"
          email={user?.email}
          links={[{ label: "Account", href: ROUTES.SETTINGS, icon: Settings }]}
          onSignOut={logout}
        />
      }
      // QueueSearch reads the URL, which needs a Suspense boundary to prerender.
      search={
        <Suspense>
          <QueueSearch />
        </Suspense>
      }
      actions={<NotificationsMenu />}
    >
      {children}
    </AppShell>
  );
}
