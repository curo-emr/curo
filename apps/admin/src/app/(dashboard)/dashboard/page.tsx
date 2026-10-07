"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Loader2, Users as UsersIcon, UserCheck, Wallet } from "lucide-react";
import { PageHeader } from "@curo/web/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { getUsers } from "@/lib/api/users";
import { getAllPayments } from "@/lib/api/payments";
import { ROLE_LABELS } from "@/lib/constants";
import type { AdminUser, Payment } from "@/types";

function money(amount: number, currency = "LKR") {
  const f = Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "LKR" ? `Rs. ${f}` : `${currency} ${f}`;
}

export default function DashboardPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUsers(), getAllPayments().catch(() => [])])
      .then(([u, p]) => { setUsers(u); setPayments(p); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const byRole = useMemo(() => {
    const acc = new Map<string, number>();
    for (const u of users) acc.set(u.role, (acc.get(u.role) ?? 0) + 1);
    return Array.from(acc.entries()).map(([role, count]) => ({ role: ROLE_LABELS[role] ?? role, count }));
  }, [users]);

  const activeCount = users.filter((u) => u.isActive).length;
  const totalIncome = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader title="Overview" description="System-wide users and income at a glance." />

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-sm border"><CardContent className="p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-full bg-status-info-bg text-status-info-text flex items-center justify-center"><UsersIcon className="h-5 w-5" /></div>
              <div><p className="text-xs text-muted-foreground">Total users</p><p className="text-xl font-bold">{users.length}</p></div>
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
      )}
    </div>
  );
}
