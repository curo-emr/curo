"use client";

import { LogOut, Mail, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@curo/web/ui/button";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { useAuth } from "@curo/web/auth";
import { useCurrentPractitioner } from "@/lib/hooks/useCurrentPractitioner";

const ROLE_LABELS: Record<string, string> = { NURSE: "Nursing Officer", SUPER_ADMIN: "Super Admin" };

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const me = useCurrentPractitioner();
  const name = me?.name.full ?? user?.email ?? "";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader title="Settings" description="Your account at the nurse station." />

      <SectionCard title="Profile">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <InitialsAvatar name={name} size="xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-lg font-semibold text-foreground truncate">{me?.name.full ?? "—"}</p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" /> {user?.email}
            </p>
            {me?.qualification && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Stethoscope className="h-4 w-4" /> {me.qualification}
              </p>
            )}
          </div>
        </div>
        <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">
          To change your name, email or password, ask a system administrator.
        </p>
      </SectionCard>

      <SectionCard title="Session">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Sign out when you leave the nurse station.</p>
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
