"use client";

import { Settings } from "lucide-react";
import { AccountMenu, AppShell, PatientSearch } from "@curo/web/shell";
import { NotificationsMenu } from "@curo/web/notifications";
import { useAuth } from "@curo/web/auth";
import { searchPatients } from "@/lib/api/patients";
import { ROUTES } from "@/lib/constants";
import { NAV } from "./nav";

const findPatients = (text: string) => searchPatients(text, 8);

export function ReceptionistShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <AppShell
      portal="Front Desk"
      home={ROUTES.DASHBOARD}
      nav={NAV}
      account={
        <AccountMenu
          name={user?.name || "Receptionist"}
          detail="Front desk"
          email={user?.email}
          links={[{ label: "Account", href: ROUTES.SETTINGS, icon: Settings }]}
          onSignOut={logout}
        />
      }
      toolbar={
        <>
          <div className="flex-1">
            <PatientSearch search={findPatients} href={ROUTES.PATIENT} />
          </div>
          <NotificationsMenu />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
