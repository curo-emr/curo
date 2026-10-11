"use client";

import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useAuth } from "@curo/web/auth";
import { formatMoney, greeting } from "@curo/web/format";
import { QueryContent, allOf } from "@curo/web/query";
import { BarList } from "@curo/web/ui/bar-list";
import { PageHeader } from "@curo/web/ui/page-header";
import { SectionCard } from "@curo/web/ui/section-card";
import { Stat, StatStrip } from "@curo/web/ui/stat";
import { NeedsAttention } from "@/components/features/dashboard/NeedsAttention";
import type { PaymentTotals } from "@/lib/api/payments";
import type { UserSummary } from "@/lib/api/users";
import { ROLE_LABELS } from "@/lib/constants";
import { paymentQueries, userQueries } from "@/lib/queries";

export default function DashboardPage() {
  const { user } = useAuth();
  const overview = allOf(useQuery(userQueries.summary()), useQuery(paymentQueries.totals()));
  const firstName = user?.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={firstName ? `${greeting()}, ${firstName}` : greeting()} description="Accounts and income across every portal." />
      <NeedsAttention />
      <QueryContent query={overview} what="the overview">
        {([users, income]) => <Overview users={users} income={income} />}
      </QueryContent>
    </div>
  );
}

function Overview({ users, income }: { users: UserSummary; income: PaymentTotals }) {
  const patients = users.byRole.PATIENT ?? 0;
  const roles = Object.entries(users.byRole)
    .map(([role, count]) => ({ label: ROLE_LABELS[role] ?? role, value: count }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <StatStrip>
        <Stat label="Staff" value={String(users.total - patients)} />
        <Stat label="Patients with a login" value={String(patients)} />
        <Stat label="Suspended" value={String(users.total - users.active)} />
        <Stat label="Income collected" value={formatMoney(income.total, income.currency)} detail={`${income.count} payments`} />
      </StatStrip>

      <SectionCard icon={Users} iconClassName="text-primary" title="Users by role">
        <BarList items={roles} />
      </SectionCard>
    </>
  );
}
