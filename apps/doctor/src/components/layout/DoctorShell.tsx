"use client";

import { Settings } from "lucide-react";
import { AccountMenu, AppShell, PatientSearch } from "@curo/web/shell";
import { NotificationsMenu } from "@curo/web/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { getPatients } from "@/lib/api/patients";
import { ROUTES } from "@/lib/constants";
import { NAV } from "./nav";

export function DoctorShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <AppShell
      portal="Doctor Portal"
      home={ROUTES.DASHBOARD}
      nav={NAV}
      account={
        <AccountMenu
          name={user?.name ? `Dr. ${user.name}` : "Doctor"}
          detail={user?.specialty || "General Practice"}
          email={user?.email}
          links={[{ label: "Account", href: ROUTES.SETTINGS, icon: Settings }]}
          onSignOut={logout}
        />
      }
      toolbar={
        <>
          <div className="flex-1">
            <PatientSearch search={getPatients} href={ROUTES.PATIENT} />
          </div>
          <NotificationsMenu />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
