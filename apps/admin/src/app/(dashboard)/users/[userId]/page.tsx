"use client";

import { use } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { KeyRound, ShieldCheck, ShieldOff, UserRound, UserX } from "lucide-react";
import { toast } from "sonner";
import { apiErrorMessage } from "@curo/web/api";
import { useAuth } from "@curo/web/auth";
import { QueryContent } from "@curo/web/query";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import { ConfirmAction } from "@curo/web/ui/confirm-action";
import { EmptyState } from "@curo/web/ui/empty-state";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { toneClass } from "@curo/web/ui/status-badge";
import { WorkplaceSelect } from "@/components/features/organizations/WorkplaceSelect";
import { CollectedIncome } from "@/components/features/payments/CollectedIncome";
import { ResetPasswordDialog } from "@/components/features/users/ResetPasswordDialog";
import { WeeklySessions } from "@/components/features/users/WeeklySessions";
import { ActiveBadge } from "@/components/ui/ActiveBadge";
import { updateUser } from "@/lib/api/users";
import { ROLE_LABELS, ROLE_TONE, ROUTES, WORKPLACE_TYPES, type UserRole } from "@/lib/constants";
import { userQueries } from "@/lib/queries";
import type { AdminUser } from "@/types";

const BACK = { href: ROUTES.USERS, label: "All users" };

export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const user = useQuery(userQueries.detail(userId));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <QueryContent query={user} what="this user">
        {u => u ? <UserDetail user={u} /> : (
          <>
            <PageHeader title="User not found" back={BACK} />
            <EmptyState icon={UserX} title="No user with this link" description="The link may be out of date. Find them from Users instead." />
          </>
        )}
      </QueryContent>
    </div>
  );
}

function UserDetail({ user }: { user: AdminUser }) {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const role = user.role as UserRole;

  // Here at once; the users list and the finder reload theirs.
  const saved = (updated: AdminUser) => {
    queryClient.setQueryData(userQueries.detail(user.id).queryKey, updated);
    void queryClient.invalidateQueries({ queryKey: userQueries.all, refetchType: "none" });
  };

  const setActive = async (isActive: boolean) => {
    try {
      saved(await updateUser(user.id, { isActive }));
      toast.success(isActive ? "Account activated" : "Account suspended", {
        description: isActive ? `${user.name} can sign in again.` : `${user.name} is signed out within 15 minutes.`,
      });
    } catch (err) {
      toast.error(apiErrorMessage(err, "The account couldn't be changed"));
    }
  };

  const changeWorkplace = async (organizationId: string) => {
    try {
      saved(await updateUser(user.id, { organizationId }));
      toast.success("Workplace changed", { description: "It takes effect at their next sign-in, or within 15 minutes." });
    } catch (err) {
      toast.error(apiErrorMessage(err, "The workplace couldn't be changed"));
    }
  };

  const details = [
    { label: "Role", value: <Badge variant="outline" className={toneClass(ROLE_TONE[role] ?? "neutral")}>{ROLE_LABELS[role] ?? role}</Badge> },
    { label: "Status", value: <ActiveBadge active={user.isActive} /> },
    { label: "Specialization", value: user.specialization },
    { label: "Phone", value: user.phone },
    { label: "Joined", value: user.createdAt && format(parseISO(user.createdAt), "d MMM yyyy") },
  ].filter(d => d.value);

  return (
    <>
      {/* An account with no profile is named by its email: don't show it twice. */}
      <PageHeader title={user.name} description={user.name !== user.email ? user.email : undefined} back={BACK}>
        {user.id !== me?.id && (user.isActive ? (
          <ConfirmAction
            trigger={<Button variant="outline"><ShieldOff /> Suspend</Button>}
            title={`Suspend ${user.name}?`}
            description="They can't sign in, and are signed out within 15 minutes. You can activate the account again at any time."
            confirmLabel="Suspend"
            destructive
            onConfirm={() => setActive(false)}
          />
        ) : (
          <Button variant="outline" onClick={() => setActive(true)}><ShieldCheck /> Activate</Button>
        ))}
        <ResetPasswordDialog user={user} trigger={<Button><KeyRound /> Reset password</Button>} />
      </PageHeader>

      <SectionCard icon={UserRound} iconClassName="text-primary" title="Account">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
          {details.map(d => (
            <div key={d.label}>
              <dt className="text-xs font-medium text-muted-foreground">{d.label}</dt>
              <dd className="mt-1 text-sm text-foreground">{d.value}</dd>
            </div>
          ))}
        </dl>
        {WORKPLACE_TYPES[role] && (
          <div className="mt-5 max-w-sm border-t pt-5">
            <WorkplaceSelect role={role} value={user.organizationId} onChange={changeWorkplace} />
          </div>
        )}
      </SectionCard>

      {role === "DOCTOR" && user.practitionerId && <WeeklySessions practitionerId={user.practitionerId} />}
      {role === "RECEPTIONIST" && user.practitionerId && <CollectedIncome practitionerId={user.practitionerId} />}
    </>
  );
}
