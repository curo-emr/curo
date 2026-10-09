"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Users as UsersIcon, UserCheck, Wallet } from "lucide-react";
import { QueryContent, allOf } from "@curo/web/query";
import { PageHeader } from "@curo/web/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import type { UserSummary } from "@/lib/api/users";
import { paymentQueries, userQueries } from "@/lib/queries";
import { ROLE_LABELS } from "@/lib/constants";

function money(amount: number, currency = "LKR") {
  const f = Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "LKR" ? `Rs. ${f}` : `${currency} ${f}`;
}

export default function DashboardPage() {
  const overview = allOf(useQuery(userQueries.summary()), useQuery(paymentQueries.totals()));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader title="Overview" description="System-wide users and income at a glance." />

      <QueryContent query={overview} what="the overview">
        {([users, totals]) => <Overview users={users} totalIncome={totals.total} />}
      </QueryContent>
    </div>
  );
}

function Overview({ users, totalIncome }: { users: UserSummary; totalIncome: number }) {
  const byRole = useMemo(
    () => Object.entries(users.byRole).map(([role, count]) => ({ role: ROLE_LABELS[role] ?? role, count })),
    [users],
  );
  const activeCount = users.active;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border"><CardContent className="p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-full bg-status-info-bg text-status-info-text flex items-center justify-center"><UsersIcon className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground">Total users</p><p className="text-xl font-bold">{users.total}</p></div>
        </CardContent></Card>
        <Card className="shadow-sm border"><CardContent className="p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-full bg-status-success-bg text-status-success-text flex items-center justify-center"><UserCheck className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground">Active accounts</p><p className="text-xl font-bold">{activeCount}</p></div>
        </CardContent></Card>
        <Card className="shadow-sm border"><CardContent className="p-5 flex items-center gap-4">
          <div className="h-11 w-11 rounded-full bg-status-purple-bg text-status-purple-text flex items-center justify-center"><Wallet className="h-5 w-5" /></div>
          <div><p className="text-xs text-muted-foreground">Total income</p><p className="text-xl font-bold">{money(totalIncome)}</p></div>
        </CardContent></Card>
      </div>

      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b pb-3"><CardTitle className="text-base">Users by role</CardTitle></CardHeader>
        <CardContent className="p-5">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byRole} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="role" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
