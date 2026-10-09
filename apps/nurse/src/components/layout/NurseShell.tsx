"use client";

import { Suspense } from "react";
import { Settings } from "lucide-react";
import { AccountMenu, AppShell } from "@curo/web/shell";
import { NotificationsMenu } from "@curo/web/notifications";
import { useAuth } from "@curo/web/auth";
import { ROUTES } from "@/lib/constants";
import { NAV } from "./nav";
import { QueueSearch } from "./QueueSearch";

export function NurseShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <AppShell
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
      toolbar={
        <>
          <div className="flex-1">
            {/* QueueSearch reads the URL, which needs a Suspense boundary to prerender. */}
            <Suspense>
              <QueueSearch />
            </Suspense>
          </div>
          <NotificationsMenu />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
