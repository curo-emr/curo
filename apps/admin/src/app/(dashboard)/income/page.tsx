"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@curo/web/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { getAllPayments } from "@/lib/api/payments";
import { getUsers } from "@/lib/api/users";
import type { Payment, AdminUser } from "@/types";

function money(amount: number, currency = "LKR") {
  const f = Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "LKR" ? `Rs. ${f}` : `${currency} ${f}`;
}

export default function IncomeOversightPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receptionists, setReceptionists] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllPayments(), getUsers(undefined, "RECEPTIONIST")])
      .then(([p, u]) => { setPayments(p); setReceptionists(u); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const nameByPractitioner = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of receptionists) if (u.practitionerId) m.set(u.practitionerId, u.name);
    return m;
  }, [receptionists]);

  const byReceptionist = useMemo(() => {
    const acc = new Map<string, { name: string; total: number; count: number }>();
    for (const p of payments) {
      const key = p.collectedBy ?? "unknown";
      const name = nameByPractitioner.get(key) ?? "Unknown";
      const cur = acc.get(key) ?? { name, total: 0, count: 0 };
      cur.total += Number(p.amount);
      cur.count += 1;
      acc.set(key, cur);
    }
    return Array.from(acc.values()).sort((a, b) => b.total - a.total);
  }, [payments, nameByPractitioner]);

  const grandTotal = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader title="Income oversight" description="Visit income collected across all receptionists." />

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : (
        <>
          <Card className="shadow-sm border">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">Total collected</p>
              <p className="text-2xl font-bold text-foreground">{money(grandTotal)}</p>
              <p className="text-xs text-muted-foreground mt-1">{payments.length} payments</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b pb-3"><CardTitle className="text-base">Income by receptionist</CardTitle></CardHeader>
            <CardContent className="p-5">
              {byReceptionist.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">No income recorded yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={byReceptionist} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                    <Tooltip
                      formatter={(value) => [money(Number(value)), "Income"]}
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                    />
                    <Bar dataKey="total" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground">
            Open a receptionist from the Users page to view and correct individual payments.
          </p>
        </>
      )}
    </div>
  );
}
