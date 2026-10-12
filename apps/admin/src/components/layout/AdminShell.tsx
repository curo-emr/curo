"use client";

import { Settings } from "lucide-react";
import { AccountMenu, AppShell, QuickFind, type FinderHit } from "@curo/web/shell";
import { NotificationsMenu } from "@curo/web/notifications";
import { useAuth } from "@curo/web/auth";
import { getUsersPaginated } from "@/lib/api/users";
import { ROLE_LABELS, ROUTES } from "@/lib/constants";
import { userQueries } from "@/lib/queries";
import { NAV } from "./nav";

// Staff and patients alike: the usual reason to look someone up is a password reset.
const findUsers = async (text: string): Promise<FinderHit[]> =>
  (await getUsersPaginated({ search: text, pageSize: 8 })).items.map(({ id, name, role, email }) => ({
    id,
    name,
    detail: `${ROLE_LABELS[role] ?? role} · ${email}`,
  }));

export function AdminShell({ children, sidebarOpen }: { children: React.ReactNode; sidebarOpen: boolean }) {
  const { user, logout } = useAuth();

  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      portal="Admin Portal"
      home={ROUTES.DASHBOARD}
      nav={NAV}
      account={
        <AccountMenu
          name={user?.name || "Administrator"}
          detail="Super admin"
          email={user?.email}
          links={[{ label: "Account", href: ROUTES.SETTINGS, icon: Settings }]}
          onSignOut={logout}
        />
      }
      toolbar={
        <>
          <div className="min-w-0 flex-1">
            <QuickFind
              label="Find a user"
              placeholder="Search by name, email or role…"
              heading="Users"
              // Under "users", so creating or changing one refreshes the results.
              queryKey={[...userQueries.all, "find"]}
              search={findUsers}
              href={ROUTES.USER}
            />
          </div>
          <NotificationsMenu />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
