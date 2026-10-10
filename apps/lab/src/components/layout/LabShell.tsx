"use client";

import { FlaskConical, Settings } from "lucide-react";
import { AccountMenu, AppShell, PatientSearch, type PatientHit } from "@curo/web/shell";
import { NotificationsMenu } from "@curo/web/notifications";
import { WorkplaceBadge } from "@curo/web/workplace";
import { useAuth } from "@curo/web/auth";
import { getPatientsPaginated } from "@/lib/api/patients";
import { ROUTES } from "@/lib/constants";
import { NAV } from "./nav";

// Only what labels a sample: the lab sees no phone numbers.
const findPatients = async (text: string): Promise<PatientHit[]> =>
  (await getPatientsPaginated({ search: text, pageSize: 8 })).items.map(({ id, name, dob, sex, mrn }) => ({ id, name, dob, sex, mrn }));

export function LabShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <AppShell
      portal="Laboratory"
      home={ROUTES.DASHBOARD}
      nav={NAV}
      account={
        <AccountMenu
          name={user?.name || "Lab staff"}
          detail="Laboratory"
          email={user?.email}
          links={[{ label: "Account", href: ROUTES.SETTINGS, icon: Settings }]}
          onSignOut={logout}
        />
      }
      toolbar={
        <>
          <div className="min-w-0 flex-1">
            <PatientSearch search={findPatients} href={ROUTES.PATIENT} />
          </div>
          <div className="hidden min-w-0 md:block">
            <WorkplaceBadge icon={FlaskConical} kind="lab" />
          </div>
          <NotificationsMenu />
        </>
      }
    >
      {children}
    </AppShell>
  );
}
